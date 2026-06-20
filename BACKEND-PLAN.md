# Vowen-Clone Dictation App — Native Rust Backend Implementation Plan

**Target:** Tauri 2 desktop dictation app for Windows + macOS.
**Pipeline:** Global hold-to-talk hotkey → mic capture → resample to 16 kHz mono f32 → Silero VAD endpointing → offline ASR (NVIDIA Parakeet TDT 0.6B int8, Whisper fallback) → inject text into focused app (paste or direct-type).
**Engine:** Single inference runtime — the official k2-fsa `sherpa-onnx` Rust crate (statically links onnxruntime; no loose dylibs to ship/sign).

> This plan trusts the adversarial corrections over the original research where they conflict. Key corrections baked in:
> - Use the **official `sherpa-onnx`** crate (1.13.x, static linking) — **not** the archived `sherpa-rs`. Config is built via `OfflineRecognizerConfig::default()` + field assignment; `provider`/`num_threads`/`debug` live on `model_config`, not on the sub-model config.
> - **`rdevin = "0.1"`** (only published version; `0.6` does not exist).
> - **`cpal = "0.16"`** pinned deliberately — the snippets here use the 0.16 API (`supported.sample_rate().0`, `build_input_stream(&cfg, …)`). Do **not** assume 0.16/0.17 are interchangeable.
> - **`rubato = "0.16"`** with the simple `Vec<Vec<f32>>` API (do not pull `audioadapter` 0.2 — that pin is wrong; only needed for rubato 3.0).
> - VAD must be fed in **exactly 512-sample windows**; verify `flush()`/`ten_vad` field names against `cargo doc` for the pinned version before relying on them.

---

## 1. Architecture Overview

### Threads / tasks

| Thread | Owner | Responsibility |
|---|---|---|
| **Tauri main / UI** | Tauri runtime | Window, JS↔Rust commands, event emission (`ptt`, `transcript`, `state`), state store, model download orchestration. |
| **Hotkey listener** | `rdevin::listen` (blocking) | OS-level low-level keyboard hook. Tracks Ctrl+Shift held state with rising/falling-edge debounce; emits `ptt start` / `ptt stop`. **On Windows, run as a separate sidecar process** (tauri#14770) — in-process hook dies when the WebView gains focus. |
| **Audio capture (cpal callback)** | cpal RT thread (WASAPI/CoreAudio) | Real-time-safe: convert sample format → f32, downmix to mono, push into lock-free SPSC ring. **No allocation, no locks, no resampling here.** |
| **Audio consumer** | spawned std thread | Drains ring → resamples src_sr→16 kHz mono (rubato) → feeds 512-sample windows to VAD → on completed segment runs the recognizer → emits interim + final transcripts. |
| **STT worker** | reused inside consumer (or its own thread) | Owns the `OfflineRecognizer` (Parakeet primary, Whisper fallback) + `VoiceActivityDetector`. Heavy decode work; never on the cpal callback. |

### Event flow (press → record → VAD → recognize → inject)

```
[user holds Ctrl+Shift]
   hotkey thread: rising edge -> emit app event "ptt" = "start"
        |
        v
  AppState.recording = true
   audio consumer: start_capture() builds cpal stream (or play() a pre-built paused stream)
        |
        v
  cpal RT callback: i16/f32 -> f32 -> downmix mono -> ring.try_push(sample)
        |
        v
  consumer loop: ring.pop_slice() -> rubato resample to 16k -> push 512-sample windows -> vad.accept_waveform()
        |                                        |
        |                                        +-- vad.front() segment ready -> recognizer.decode() -> FINAL text
        +-- every ~200ms: re-decode growing buffer -> INTERIM text (emit "transcript" {interim:true})
        |
        v
[user releases Ctrl+Shift]
   hotkey thread: falling edge -> emit "ptt" = "stop"
        |
        v
  AppState.recording = false; consumer drains remainder, vad.flush(), final decode
        |
        v
  accumulate full transcript -> inject (paste-via-clipboard default | direct-type fallback)
        |
        v
  emit "transcript" {final text} to UI; restore clipboard
```

### Crate boundary / linkage

- All inference (Parakeet transducer + Whisper + Silero VAD) goes through one statically-linked engine: `sherpa-onnx` 1.13.x default features ⇒ `build.rs` auto-downloads the matching prebuilt static native lib (`win-x64-static-MT-Release-lib` / `osx-arm64-static`) on first build. **Nothing loose to ship or codesign.** A working MSVC + cmake (Windows) / Xcode CLT + cmake (macOS) is enough.

---

## 2. Cargo dependencies (`src-tauri/Cargo.toml`)

```toml
[package]
name = "vowen-clone"
version = "0.1.0"
edition = "2021"
rust-version = "1.85"   # rubato/cpal MSRV headroom

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
# --- Tauri core + plugins ---
tauri = { version = "2", features = [] }
tauri-plugin-global-shortcut = "2"          # fallback PTT path (combo with a non-modifier key)
tauri-plugin-clipboard-manager = "2"        # clipboard read/write for paste-injection

# --- Inference engine (OFFICIAL k2-fsa crate; static link, libs auto-downloaded) ---
sherpa-onnx = "1.13"                         # default features = static linking

# --- Audio capture + DSP ---
cpal = "0.16"                                # NOTE: snippets target the 0.16 API specifically
ringbuf = "0.4"                              # lock-free SPSC ring
rubato = "0.16"                              # simple Vec<Vec<f32>> resampler API

# --- Global hotkey (low-level hook, modifier-only hold) ---
rdevin = "0.1"                               # ONLY published version; fork of stale rdev. Pin exactly.

# --- Input synthesis (paste + type) ---
enigo = "0.6"                                # SendInput (Win) / CGEvent (mac), Unicode/emoji safe

# --- Model download / extract / verify ---
reqwest = { version = "0.12", features = ["stream", "rustls-tls"] }  # rustls avoids OpenSSL on Win
tar = "0.4"
bzip2 = "0.5"
sha2 = "0.10"
futures-util = "0.3"                         # stream the download body

# --- Misc ---
serde = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1"
thiserror = "2"
parking_lot = "0.12"                         # cheap Mutex/RwLock for app state
crossbeam-channel = "0.5"                    # consumer <-> main signalling

[target.'cfg(target_os = "macos")'.dependencies]
macos-accessibility-client = "0.0"           # AXIsProcessTrusted(WithOptions) explicit prompt/recheck

[features]
default = []
```

> **GPU note:** the default auto-downloaded static archive is **CPU-only on Windows**. To use `directml`/`cuda` you must supply a native lib built with that EP (set `SHERPA_ONNX_LIB_DIR` or use the `shared` feature + matching GPU archive). On macOS, `provider = "coreml"` works with the default static archive. Ship CPU by default; make provider a setting.

---

## 3. Module-by-module Rust skeletons

> Directory layout under `src-tauri/src/`:
> ```
> lib.rs        # Tauri builder, commands, events, AppState
> models.rs     # catalog, download+extract+verify, path resolution, recognizer kind detection
> audio.rs      # cpal capture -> downmix mono -> SPSC ring -> rubato resample to 16k
> stt.rs        # sherpa-onnx OfflineRecognizer (Parakeet/Whisper) + Silero VAD pipeline
> hotkey.rs     # rdevin Ctrl+Shift hold-to-talk listener
> inject.rs     # enigo paste + direct-type
> ```

### 3.1 `models.rs` — download, extract, resolve, classify

```rust
use anyhow::{anyhow, Context, Result};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelEntry {
    pub id: String,
    pub kind: ModelKind,           // Transducer | Whisper | Vad
    pub url: String,               // .tar.bz2 archive, or bare .onnx for VAD
    pub sha256: Option<String>,    // verify after download (fill in real hashes)
    pub bytes: u64,                // approx, for progress UI
    /// Files we expect AFTER extraction, relative to the extracted dir.
    /// VAD = single bare file (no archive root).
    pub files: ModelFiles,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelKind { Transducer, Whisper, Vad }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ModelFiles {
    Transducer { encoder: String, decoder: String, joiner: String, tokens: String },
    Whisper { encoder: String, decoder: String, tokens: String },
    Vad { model: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Catalog { pub models: Vec<ModelEntry> }

impl Catalog {
    /// Load the bundled models.json (Tauri resource) or fall back to the embedded default.
    pub fn load(path: Option<&Path>) -> Result<Self> {
        if let Some(p) = path {
            let txt = std::fs::read_to_string(p)
                .with_context(|| format!("read catalog {}", p.display()))?;
            return Ok(serde_json::from_str(&txt)?);
        }
        Ok(serde_json::from_str(DEFAULT_CATALOG_JSON)?)
    }
    pub fn get(&self, id: &str) -> Option<&ModelEntry> {
        self.models.iter().find(|m| m.id == id)
    }
}

/// Resolved on-disk paths for a model that is present locally.
#[derive(Debug, Clone)]
pub enum ResolvedModel {
    Transducer { dir: PathBuf, encoder: PathBuf, decoder: PathBuf, joiner: PathBuf, tokens: PathBuf },
    Whisper { dir: PathBuf, encoder: PathBuf, decoder: PathBuf, tokens: PathBuf },
    Vad { model: PathBuf },
}

/// App-data root for models, e.g. resolved via Tauri path API:
/// app.path().app_data_dir()?.join("models")
pub fn model_dir(root: &Path, id: &str) -> PathBuf { root.join(id) }

/// Returns the resolved model if all expected files already exist on disk.
pub fn resolve(root: &Path, entry: &ModelEntry) -> Option<ResolvedModel> {
    let dir = model_dir(root, &entry.id);
    match &entry.files {
        ModelFiles::Transducer { encoder, decoder, joiner, tokens } => {
            let (e, d, j, t) = (dir.join(encoder), dir.join(decoder), dir.join(joiner), dir.join(tokens));
            (e.exists() && d.exists() && j.exists() && t.exists())
                .then_some(ResolvedModel::Transducer { dir, encoder: e, decoder: d, joiner: j, tokens: t })
        }
        ModelFiles::Whisper { encoder, decoder, tokens } => {
            let (e, d, t) = (dir.join(encoder), dir.join(decoder), dir.join(tokens));
            (e.exists() && d.exists() && t.exists())
                .then_some(ResolvedModel::Whisper { dir, encoder: e, decoder: d, tokens: t })
        }
        ModelFiles::Vad { model } => {
            let m = dir.join(model);
            m.exists().then_some(ResolvedModel::Vad { model: m })
        }
    }
}

/// Download (with progress callback), verify sha256, and extract if it's an archive.
/// `progress(downloaded, total)` is called periodically; wire it to a Tauri event.
pub async fn ensure_downloaded<F>(
    root: &Path,
    entry: &ModelEntry,
    mut progress: F,
) -> Result<ResolvedModel>
where
    F: FnMut(u64, u64),
{
    if let Some(r) = resolve(root, entry) {
        return Ok(r);
    }
    let dir = model_dir(root, &entry.id);
    std::fs::create_dir_all(&dir).context("create model dir")?;

    let is_archive = entry.url.ends_with(".tar.bz2");
    let tmp = dir.join(if is_archive { "download.tar.bz2" } else {
        // bare .onnx (VAD): write directly to the expected filename
        match &entry.files { ModelFiles::Vad { model } => model.clone(), _ => "download.bin".into() }
    });

    // --- streamed download ---
    let resp = reqwest::get(&entry.url).await.context("GET model")?.error_for_status()?;
    let total = resp.content_length().unwrap_or(entry.bytes);
    let mut hasher = Sha256::new();
    let mut downloaded = 0u64;
    {
        let mut file = std::fs::File::create(&tmp).context("create tmp")?;
        use std::io::Write;
        let mut stream = resp.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.context("stream chunk")?;
            hasher.update(&chunk);
            file.write_all(&chunk).context("write chunk")?;
            downloaded += chunk.len() as u64;
            progress(downloaded, total);
        }
        file.flush().ok();
    }

    // --- verify ---
    if let Some(expected) = &entry.sha256 {
        let got = hex::encode_lower(hasher.finalize());
        if &got != expected {
            std::fs::remove_file(&tmp).ok();
            return Err(anyhow!("sha256 mismatch for {}: expected {expected}, got {got}", entry.id));
        }
    }

    // --- extract (.tar.bz2) ---
    if is_archive {
        extract_tar_bz2_flatten(&tmp, &dir).context("extract archive")?;
        std::fs::remove_file(&tmp).ok();
    }

    resolve(root, entry).ok_or_else(|| anyhow!("model files missing after install: {}", entry.id))
}

/// Extract a .tar.bz2 into `dest`, flattening the single top-level archive directory
/// (sherpa archives wrap files in e.g. `sherpa-onnx-nemo-parakeet-.../`).
fn extract_tar_bz2_flatten(archive: &Path, dest: &Path) -> Result<()> {
    let f = std::fs::File::open(archive)?;
    let bz = bzip2::read::BzDecoder::new(f);
    let mut ar = tar::Archive::new(bz);
    for entry in ar.entries()? {
        let mut entry = entry?;
        let path = entry.path()?.into_owned();
        // strip the first path component (archive root dir)
        let stripped: PathBuf = path.components().skip(1).collect();
        if stripped.as_os_str().is_empty() { continue; }
        let out = dest.join(stripped);
        if let Some(parent) = out.parent() { std::fs::create_dir_all(parent)?; }
        entry.unpack(&out)?;
    }
    Ok(())
}

// tiny hex helper to avoid an extra dep
mod hex {
    pub fn encode_lower(bytes: impl AsRef<[u8]>) -> String {
        bytes.as_ref().iter().map(|b| format!("{b:02x}")).collect()
    }
}

pub const DEFAULT_CATALOG_JSON: &str = include_str!("../models.json");
```

> **Verify-before-hardcode:** after first extraction of each tarball, confirm the exact file names (`encoder.int8.onnx` vs `encoder.onnx`, `tokens.txt`) and fill in the real `sha256` values in `models.json`. The catalog in §4 uses the documented names but the corrections flag this as worth a one-time check.

### 3.2 `audio.rs` — cpal capture → mono → SPSC ring → rubato 16k

```rust
use anyhow::{anyhow, Result};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use ringbuf::traits::{Consumer, Producer, Split};
use ringbuf::HeapRb;
use rubato::{FftFixedIn, Resampler};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub const TARGET_SR: usize = 16_000;
const RESAMPLE_CHUNK: usize = 1024; // mono input frames per resampler call

/// Owns the live capture stream + source sample rate.
pub struct Capture {
    pub stream: cpal::Stream, // keep alive; dropping stops capture
    pub src_sr: u32,
}

/// Build a default input stream that downmixes to mono f32 and pushes into `prod`.
/// cpal 0.16 API: build_input_stream(&cfg, ...), supported.sample_rate().0
pub fn start_capture(
    mut prod: impl Producer<Item = f32> + Send + 'static,
) -> Result<Capture> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| anyhow!("no default input device"))?;
    let supported = device.default_input_config()?;
    let src_sr = supported.sample_rate().0;          // 0.16: SampleRate is a struct
    let channels = supported.channels() as usize;
    let cfg: StreamConfig = supported.config();
    let err_fn = |e| eprintln!("cpal stream error: {e}");

    macro_rules! mono_push {
        ($ty:ty, $to_f32:expr) => {{
            device.build_input_stream(
                &cfg,                                  // 0.16: pass by reference
                move |data: &[$ty], _: &cpal::InputCallbackInfo| {
                    for frame in data.chunks_exact(channels) {
                        let mut acc = 0.0f32;
                        for &s in frame { acc += ($to_f32)(s); }
                        let _ = prod.try_push(acc / channels as f32); // drop if behind
                    }
                },
                err_fn,
                None, // timeout: Option<Duration>
            )?
        }};
    }

    let stream = match supported.sample_format() {
        SampleFormat::F32 => mono_push!(f32, |s: f32| s),
        SampleFormat::I16 => mono_push!(i16, |s: i16| s as f32 / 32768.0),
        SampleFormat::U16 => mono_push!(u16, |s: u16| (s as f32 - 32768.0) / 32768.0),
        other => return Err(anyhow!("unsupported sample format {other:?}")),
    };
    stream.play()?;
    Ok(Capture { stream, src_sr })
}

/// Streaming resampler src_sr -> 16k mono. Call `push` with arbitrary-length mono
/// chunks; collects 16k output. `flush` on stop to emit the tail.
pub struct Resampler16k {
    inner: FftFixedIn<f32>,
    src_sr: usize,
    in_buf: Vec<f32>, // accumulates until a full RESAMPLE_CHUNK is available
}

impl Resampler16k {
    pub fn new(src_sr: u32) -> Result<Self> {
        let inner = FftFixedIn::<f32>::new(src_sr as usize, TARGET_SR, RESAMPLE_CHUNK, 1, 1)?;
        Ok(Self { inner, src_sr: src_sr as usize, in_buf: Vec::with_capacity(RESAMPLE_CHUNK * 2) })
    }

    /// Push mono samples at src_sr; appends resampled 16k samples to `out`.
    pub fn push(&mut self, mono: &[f32], out: &mut Vec<f32>) -> Result<()> {
        // Passthrough if already 16k.
        if self.src_sr == TARGET_SR { out.extend_from_slice(mono); return Ok(()); }
        self.in_buf.extend_from_slice(mono);
        while self.in_buf.len() >= RESAMPLE_CHUNK {
            let chunk: Vec<f32> = self.in_buf.drain(..RESAMPLE_CHUNK).collect();
            let waves_in = vec![chunk];                 // rubato 0.16: per-channel Vec
            let waves_out = self.inner.process(&waves_in, None)?;
            out.extend_from_slice(&waves_out[0]);
        }
        Ok(())
    }

    /// Zero-pad and process the final partial chunk on stop.
    pub fn flush(&mut self, out: &mut Vec<f32>) -> Result<()> {
        if self.src_sr == TARGET_SR || self.in_buf.is_empty() { return Ok(()); }
        let mut chunk = std::mem::take(&mut self.in_buf);
        chunk.resize(RESAMPLE_CHUNK, 0.0);
        let waves_out = self.inner.process(&vec![chunk], None)?;
        out.extend_from_slice(&waves_out[0]);
        Ok(())
    }
}

/// Convenience: a ring sized for ~2s @ 48k.
pub fn make_ring() -> (impl Producer<Item = f32>, impl Consumer<Item = f32>) {
    HeapRb::<f32>::new(48_000 * 2).split()
}

/// Drain helper used by the consumer loop.
pub fn drain_into(cons: &mut impl Consumer<Item = f32>, scratch: &mut Vec<f32>) -> usize {
    scratch.clear();
    let mut tmp = [0.0f32; 2048];
    let mut total = 0;
    loop {
        let n = cons.pop_slice(&mut tmp);
        if n == 0 { break; }
        scratch.extend_from_slice(&tmp[..n]);
        total += n;
    }
    total
}

pub type RecordingFlag = Arc<AtomicBool>;
pub fn flag(v: bool) -> RecordingFlag { Arc::new(AtomicBool::new(v)) }
pub fn is_recording(f: &RecordingFlag) -> bool { f.load(Ordering::Relaxed) }
pub fn set_recording(f: &RecordingFlag, v: bool) { f.store(v, Ordering::Relaxed); }
```

### 3.3 `stt.rs` — sherpa-onnx OfflineRecognizer (Parakeet/Whisper) + Silero VAD

```rust
use anyhow::{anyhow, Result};
use sherpa_onnx::{
    OfflineRecognizer, OfflineRecognizerConfig, OfflineTransducerModelConfig,
    OfflineWhisperModelConfig, SileroVadModelConfig, VadModelConfig, VoiceActivityDetector,
};

use crate::models::ResolvedModel;

pub const VAD_WINDOW: usize = 512;     // REQUIRED Silero window size; do not change
pub const SAMPLE_RATE: i32 = 16_000;

/// Build an OfflineRecognizer from a resolved model (transducer or whisper).
/// IMPORTANT (per corrections): provider/num_threads/debug live on model_config,
/// NOT inside the sub-model config. The crate infers transducer vs whisper from
/// whichever sub-config is populated (no model_type string needed in Rust).
pub fn build_recognizer(model: &ResolvedModel, provider: &str) -> Result<OfflineRecognizer> {
    let mut cfg = OfflineRecognizerConfig::default();
    match model {
        ResolvedModel::Transducer { encoder, decoder, joiner, tokens, .. } => {
            cfg.model_config.transducer = OfflineTransducerModelConfig {
                encoder: Some(encoder.to_string_lossy().into_owned()),
                decoder: Some(decoder.to_string_lossy().into_owned()),
                joiner:  Some(joiner.to_string_lossy().into_owned()),
            };
            cfg.model_config.tokens = Some(tokens.to_string_lossy().into_owned());
        }
        ResolvedModel::Whisper { encoder, decoder, tokens, .. } => {
            cfg.model_config.whisper = OfflineWhisperModelConfig {
                encoder: Some(encoder.to_string_lossy().into_owned()),
                decoder: Some(decoder.to_string_lossy().into_owned()),
                language: Some("en".to_string()),     // "" = auto-detect
                task: Some("transcribe".to_string()),
                tail_paddings: 0,
                enable_token_timestamps: false,
                enable_segment_timestamps: false,
            };
            cfg.model_config.tokens = Some(tokens.to_string_lossy().into_owned());
        }
        ResolvedModel::Vad { .. } => return Err(anyhow!("VAD model passed to recognizer builder")),
    }
    cfg.model_config.provider = Some(provider.to_string()); // "cpu" | "coreml" | "directml" | "cuda"
    cfg.model_config.num_threads = 2;
    cfg.model_config.debug = false;
    OfflineRecognizer::create(&cfg).map_err(|e| anyhow!("recognizer create failed: {e:?}"))
}

/// One-shot decode of a 16k mono f32 buffer.
pub fn transcribe(rec: &OfflineRecognizer, samples: &[f32]) -> String {
    let stream = rec.create_stream();
    stream.accept_waveform(SAMPLE_RATE, samples); // MUST be 16k mono f32 in [-1, 1]
    rec.decode(&stream);
    stream.get_result().map(|r| r.text).unwrap_or_default()
}

/// Build a Silero VAD detector. NOTE: build the config via default() + field
/// assignment (the literal-struct form with ten_vad/num_threads/provider was
/// NOT verified). Confirm field/method names against `cargo doc` for the pinned
/// sherpa-onnx version before relying on flush()/ten_vad.
pub fn build_vad(vad_model_path: &str) -> Result<VoiceActivityDetector> {
    let mut silero = SileroVadModelConfig::default();
    silero.model = Some(vad_model_path.to_string());
    silero.threshold = 0.5;
    silero.min_silence_duration = 0.25;
    silero.min_speech_duration = 0.25;
    silero.max_speech_duration = 8.0;
    silero.window_size = VAD_WINDOW as i32;

    let mut vad_cfg = VadModelConfig::default();
    vad_cfg.silero_vad = silero;
    vad_cfg.sample_rate = SAMPLE_RATE;
    // vad_cfg.num_threads = 1; vad_cfg.provider = Some("cpu".into());  // verify names first

    VoiceActivityDetector::create(&vad_cfg, 30.0) // 30s internal buffer
        .map_err(|e| anyhow!("vad create failed: {e:?}"))
}

/// Streaming dictation engine: feed 16k mono samples; get interim + final text.
pub struct Engine {
    pub recognizer: OfflineRecognizer,
    pub fallback: Option<OfflineRecognizer>, // Whisper
    pub vad: VoiceActivityDetector,
    pending: Vec<f32>,    // accumulates < VAD_WINDOW remainder
    interim_buf: Vec<f32>,// growing in-progress buffer for interim re-decode
    pub final_text: String,
}

impl Engine {
    pub fn new(recognizer: OfflineRecognizer, fallback: Option<OfflineRecognizer>, vad: VoiceActivityDetector) -> Self {
        Self { recognizer, fallback, vad, pending: Vec::new(), interim_buf: Vec::new(), final_text: String::new() }
    }

    /// Feed resampled 16k mono samples. Returns any FINAL segment texts produced.
    pub fn feed(&mut self, samples: &[f32]) -> Vec<String> {
        let mut finals = Vec::new();
        self.pending.extend_from_slice(samples);
        self.interim_buf.extend_from_slice(samples);

        // Feed VAD strictly in 512-sample windows.
        while self.pending.len() >= VAD_WINDOW {
            let window: Vec<f32> = self.pending.drain(..VAD_WINDOW).collect();
            self.vad.accept_waveform(&window);
            while let Some(seg) = self.vad.front() {
                let text = transcribe(&self.recognizer, seg.samples());
                let text = text.trim();
                if !text.is_empty() {
                    self.final_text.push_str(text);
                    self.final_text.push(' ');
                    finals.push(text.to_string());
                }
                self.vad.pop();
                self.interim_buf.clear(); // segment committed; reset interim buffer
            }
        }
        finals
    }

    /// Periodic interim transcript of the in-progress buffer (call every ~200ms).
    pub fn interim(&self) -> String {
        if self.interim_buf.len() < SAMPLE_RATE as usize / 5 { return String::new(); } // <0.2s -> skip
        transcribe(&self.recognizer, &self.interim_buf)
    }

    /// On stop: flush trailing speech and finalize.
    pub fn finish(&mut self) -> String {
        // Drain any < VAD_WINDOW remainder by zero-padding one last window.
        if !self.pending.is_empty() {
            let mut last = std::mem::take(&mut self.pending);
            last.resize(VAD_WINDOW, 0.0);
            self.vad.accept_waveform(&last);
        }
        self.vad.flush(); // verify method name vs cargo doc
        while let Some(seg) = self.vad.front() {
            let text = transcribe(&self.recognizer, seg.samples());
            let text = text.trim();
            if !text.is_empty() { self.final_text.push_str(text); self.final_text.push(' '); }
            self.vad.pop();
        }
        self.final_text.trim().to_string()
    }
}
```

### 3.4 `hotkey.rs` — rdevin Ctrl+Shift hold-to-talk

```rust
use rdevin::{listen, Event, EventType, Key};
use std::cell::RefCell;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

#[derive(Default)]
struct Mods { ctrl: bool, shift: bool }

/// Spawn the global low-level keyboard hook. Emits Tauri event "ptt" = "start"|"stop"
/// on the rising/falling edge of (Ctrl AND Shift) being held.
///
/// WINDOWS: in-process hooks stop delivering once the WebView gains focus
/// (tauri#14770). For production, build this as a SEPARATE sidecar binary and
/// forward start/stop over stdio/IPC. This function is the listener core either way.
pub fn spawn_ptt_listener(app: AppHandle) {
    std::thread::spawn(move || {
        let state = RefCell::new(Mods::default());
        let active = AtomicBool::new(false); // true once "start" emitted

        let cb = move |event: Event| {
            let mut m = state.borrow_mut();
            match event.event_type {
                EventType::KeyPress(k)   => set(&mut m, k, true),
                EventType::KeyRelease(k) => set(&mut m, k, false),
                _ => return,
            }
            let both = m.ctrl && m.shift;
            // Rising edge -> start; falling edge -> stop (debounced via `active`).
            if both && !active.swap(true, Ordering::SeqCst) {
                let _ = app.emit("ptt", "start");
            } else if !both && active.swap(false, Ordering::SeqCst) {
                let _ = app.emit("ptt", "stop");
            }
        };

        if let Err(e) = listen(cb) {
            eprintln!("rdevin listen error: {e:?}");
        }
    });
}

fn set(m: &mut Mods, k: Key, down: bool) {
    match k {
        Key::ControlLeft | Key::ControlRight => m.ctrl = down,
        Key::ShiftLeft   | Key::ShiftRight   => m.shift = down,
        _ => {}
    }
}
```

> **Alternative (Approach A):** if you switch the PTT combo to include a non-modifier key (e.g. `Ctrl+Shift+Space`), use `tauri-plugin-global-shortcut` instead — its handler delivers both `ShortcutState::Pressed` and `Released`, needs no macOS Accessibility, and is unaffected by the Windows focus bug. The plugin **cannot** register modifier-only accelerators, which is why `rdevin` is required for a literal "hold Ctrl+Shift".

### 3.5 `inject.rs` — enigo paste + direct-type

```rust
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::{thread, time::Duration};
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

fn make_enigo() -> Result<Enigo, String> {
    let settings = Settings {
        open_prompt_to_get_permissions: true, // macOS: auto-open Accessibility prompt
        independent_of_keyboard_state: true,  // macOS: ignore held Shift/Caps
        ..Default::default()
    };
    Enigo::new(&settings).map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
pub fn ensure_accessibility() -> bool {
    macos_accessibility_client::accessibility::application_is_trusted_with_prompt()
}
#[cfg(not(target_os = "macos"))]
pub fn ensure_accessibility() -> bool { true }

/// Method 1 (default): clipboard paste — atomic, layout/IME-proof.
pub fn insert_via_paste(app: &AppHandle, text: &str) -> Result<(), String> {
    if !ensure_accessibility() {
        return Err("Accessibility/Input permission not granted".into());
    }
    let clip = app.clipboard();
    let previous = clip.read_text().ok();                        // save clipboard
    clip.write_text(text.to_string()).map_err(|e| e.to_string())?;

    let mut enigo = make_enigo()?;
    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;     // Cmd+V
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;  // Ctrl+V

    enigo.key(modifier, Direction::Press).map_err(|e| e.to_string())?;
    enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
    enigo.key(modifier, Direction::Release).map_err(|e| e.to_string())?;

    thread::sleep(Duration::from_millis(120)); // let target consume paste
    if let Some(prev) = previous { let _ = clip.write_text(prev); } // best-effort restore
    Ok(())
}

/// Method 2 (fallback): direct Unicode typing. Emoji-safe, layout-independent, slower.
pub fn insert_via_typing(text: &str) -> Result<(), String> {
    if !ensure_accessibility() {
        return Err("Accessibility/Input permission not granted".into());
    }
    let sanitized = text.replace('\0', ""); // enigo text() rejects NUL bytes
    let mut enigo = make_enigo()?;
    enigo.text(&sanitized).map_err(|e| e.to_string())
}
```

> **Caveats baked in:** clipboard restore only round-trips plain text (can clobber copied images/HTML). The macOS Cmd+V via `Key::Unicode('v')` relies on unicode→keycode mapping; usually fine but slightly less robust than a keycode-based send in some apps. Run injection on the main thread on macOS (`app.run_on_main_thread`).

### 3.6 `lib.rs` — Tauri builder, state, commands, event wiring

```rust
mod audio;
mod hotkey;
mod inject;
mod models;
mod stt;

use audio::{flag, is_recording, make_ring, set_recording, start_capture, Capture, RecordingFlag, Resampler16k, TARGET_SR};
use models::{Catalog, ResolvedModel};
use parking_lot::Mutex;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Clone, serde::Serialize)]
struct TranscriptEvent { text: String, interim: bool }

/// Which injection method to use.
#[derive(Clone, Copy, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
enum InjectMode { Paste, Type }

struct AppState {
    catalog: Catalog,
    recording: RecordingFlag,
    capture: Mutex<Option<Capture>>, // live stream lives here while recording
    primary_id: Mutex<String>,
    fallback_id: Mutex<Option<String>>,
    vad_id: Mutex<String>,
    provider: Mutex<String>,
    inject_mode: Mutex<InjectMode>,
}

fn provider_default() -> String {
    if cfg!(target_os = "macos") { "coreml".into() } else { "cpu".into() }
}

#[tauri::command]
async fn download_model(app: AppHandle, state: State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?.join("models");
    let entry = state.catalog.get(&id).ok_or("unknown model id")?.clone();
    let app2 = app.clone();
    models::ensure_downloaded(&root, &entry, move |done, total| {
        let _ = app2.emit("model-progress", serde_json::json!({ "id": id, "done": done, "total": total }));
    })
    .await
    .map(|_| ())
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_inject_mode(state: State<'_, Arc<AppState>>, mode: InjectMode) { *state.inject_mode.lock() = mode; }

#[tauri::command]
fn list_models(state: State<'_, Arc<AppState>>) -> Vec<models::ModelEntry> { state.catalog.models.clone() }

/// Start a recording session: resolve models, build engine, spawn the consumer thread.
fn start_session(app: &AppHandle, state: &Arc<AppState>) -> Result<(), String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?.join("models");

    let resolve_id = |id: &str| -> Result<ResolvedModel, String> {
        let e = state.catalog.get(id).ok_or("unknown model")?;
        models::resolve(&root, e).ok_or_else(|| format!("model {id} not downloaded"))
    };

    let primary = resolve_id(&state.primary_id.lock())?;
    let fallback = state.fallback_id.lock().as_ref().and_then(|id| resolve_id(id).ok());
    let vad_model = match resolve_id(&state.vad_id.lock())? {
        ResolvedModel::Vad { model } => model,
        _ => return Err("vad id is not a VAD model".into()),
    };
    let provider = state.provider.lock().clone();

    let recognizer = stt::build_recognizer(&primary, &provider).map_err(|e| e.to_string())?;
    let fb = fallback.as_ref().map(|m| stt::build_recognizer(m, &provider)).transpose().map_err(|e| e.to_string())?;
    let vad = stt::build_vad(&vad_model.to_string_lossy()).map_err(|e| e.to_string())?;
    let mut engine = stt::Engine::new(recognizer, fb, vad);

    // Audio ring + capture
    let (prod, mut cons) = make_ring();
    let capture = start_capture(prod).map_err(|e| e.to_string())?;
    let src_sr = capture.src_sr;
    *state.capture.lock() = Some(capture);

    set_recording(&state.recording, true);
    let recording = state.recording.clone();
    let app_for_thread = app.clone();
    let state_for_thread = state.clone();

    std::thread::spawn(move || {
        let mut resampler = match Resampler16k::new(src_sr) { Ok(r) => r, Err(e) => { eprintln!("resampler: {e}"); return; } };
        let mut scratch = Vec::with_capacity(8192);
        let mut resampled = Vec::with_capacity(TARGET_SR);
        let mut last_interim = Instant::now();

        while is_recording(&recording) {
            let n = audio::drain_into(&mut cons, &mut scratch);
            if n == 0 { std::thread::sleep(Duration::from_millis(5)); continue; }
            resampled.clear();
            if resampler.push(&scratch, &mut resampled).is_err() { continue; }
            for txt in engine.feed(&resampled) {
                let _ = app_for_thread.emit("transcript", TranscriptEvent { text: txt, interim: false });
            }
            if last_interim.elapsed() >= Duration::from_millis(200) {
                let it = engine.interim();
                if !it.is_empty() { let _ = app_for_thread.emit("transcript", TranscriptEvent { text: it, interim: true }); }
                last_interim = Instant::now();
            }
        }

        // Stop: flush resampler tail into the engine, finalize, inject.
        resampled.clear();
        let _ = resampler.flush(&mut resampled);
        engine.feed(&resampled);
        let final_text = engine.finish();

        if !final_text.is_empty() {
            let mode = *state_for_thread.inject_mode.lock();
            let result = match mode {
                InjectMode::Paste => inject::insert_via_paste(&app_for_thread, &final_text),
                InjectMode::Type => inject::insert_via_typing(&final_text),
            };
            if let Err(e) = result { eprintln!("inject error: {e}"); }
            let _ = app_for_thread.emit("transcript", TranscriptEvent { text: final_text, interim: false });
        }
        let _ = app_for_thread.emit("state", "idle");
    });

    let _ = app.emit("state", "recording");
    Ok(())
}

fn stop_session(state: &Arc<AppState>) {
    set_recording(&state.recording, false);
    *state.capture.lock() = None; // drop stream -> stop capture
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let catalog_path = app.path().resolve("models.json", tauri::path::BaseDirectory::Resource).ok();
            let catalog = Catalog::load(catalog_path.as_deref()).expect("load catalog");

            let state = Arc::new(AppState {
                catalog,
                recording: flag(false),
                capture: Mutex::new(None),
                primary_id: Mutex::new("parakeet-tdt-0.6b-v3-int8".into()),
                fallback_id: Mutex::new(Some("whisper-base.en".into())),
                vad_id: Mutex::new("silero-vad".into()),
                provider: Mutex::new(provider_default()),
                inject_mode: Mutex::new(InjectMode::Paste),
            });
            app.manage(state.clone());

            // Hotkey -> ptt start/stop -> session control.
            hotkey::spawn_ptt_listener(app.handle().clone());
            let app_handle = app.handle().clone();
            let state_for_listener = state.clone();
            app.listen("ptt", move |event| {
                let payload = event.payload().trim_matches('"');
                match payload {
                    "start" => { if let Err(e) = start_session(&app_handle, &state_for_listener) { eprintln!("start: {e}"); } }
                    "stop"  => stop_session(&state_for_listener),
                    _ => {}
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![download_model, set_inject_mode, list_models])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

> **Tauri v2 capabilities** (in `src-tauri/capabilities/default.json`): grant `clipboard-manager:allow-write-text`, `clipboard-manager:allow-read-text`, and `global-shortcut:allow-register`/`allow-unregister` or read/write will error.

---

## 4. Model catalog + `models.json` schema

All archives live permanently on the single stable `asr-models` GitHub release tag (good for re-mirroring to your own CDN/S3). HuggingFace `csukuangfj/*` repos are a verified second source. Licenses: **Parakeet/NeMo = CC-BY-4.0** (commercial OK with attribution), **Silero VAD = MIT**, **Whisper = MIT** — all freely redistributable; ship the LICENSE files alongside.

### Real download URLs

| Model | Kind | URL | Files (after extract) | Approx |
|---|---|---|---|---|
| Parakeet TDT 0.6B **v3** int8 (25 EU langs) | transducer | `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2` | `encoder.int8.onnx` (652M), `decoder.int8.onnx` (11.8M), `joiner.int8.onnx` (6.36M), `tokens.txt` (93.9k) | ~671 MB |
| Parakeet TDT 0.6B **v2** int8 (EN) | transducer | `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2` | `encoder.int8.onnx` (652M), `decoder.int8.onnx` (7.26M), `joiner.int8.onnx` (1.74M), `tokens.txt` (9.38k) | ~661 MB |
| Whisper base.en | whisper | `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-base.en.tar.bz2` | `base.en-encoder.int8.onnx`, `base.en-decoder.int8.onnx`, `base.en-tokens.txt` | ~tens of MB (int8 pair) |
| Whisper tiny.en | whisper | `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.en.tar.bz2` | `tiny.en-encoder.int8.onnx`, `tiny.en-decoder.int8.onnx`, `tiny.en-tokens.txt` | small |
| Silero VAD v5 | vad | `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx` (bare file, **not** a tarball) | `silero_vad.onnx` | ~2.2 MB |

> Whisper archives ship both `*-encoder.onnx`/`*-decoder.onnx` (large) and `*-encoder.int8.onnx`/`*-decoder.int8.onnx` (smaller) — **use the int8 pair**. **Verify exact file names after extracting each tarball** (the corrections flag `encoder.int8.onnx` vs `encoder.onnx` as worth a one-time check) before locking the `files` paths and filling in real `sha256` values.

### `models.json` schema (ship as a Tauri resource)

```json
{
  "models": [
    {
      "id": "parakeet-tdt-0.6b-v3-int8",
      "kind": "transducer",
      "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2",
      "sha256": null,
      "bytes": 703000000,
      "files": {
        "type": "transducer",
        "encoder": "encoder.int8.onnx",
        "decoder": "decoder.int8.onnx",
        "joiner": "joiner.int8.onnx",
        "tokens": "tokens.txt"
      }
    },
    {
      "id": "parakeet-tdt-0.6b-v2-int8",
      "kind": "transducer",
      "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2",
      "sha256": null,
      "bytes": 693000000,
      "files": {
        "type": "transducer",
        "encoder": "encoder.int8.onnx",
        "decoder": "decoder.int8.onnx",
        "joiner": "joiner.int8.onnx",
        "tokens": "tokens.txt"
      }
    },
    {
      "id": "whisper-base.en",
      "kind": "whisper",
      "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-base.en.tar.bz2",
      "sha256": null,
      "bytes": 120000000,
      "files": {
        "type": "whisper",
        "encoder": "base.en-encoder.int8.onnx",
        "decoder": "base.en-decoder.int8.onnx",
        "tokens": "base.en-tokens.txt"
      }
    },
    {
      "id": "silero-vad",
      "kind": "vad",
      "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx",
      "sha256": null,
      "bytes": 2200000,
      "files": { "type": "vad", "model": "silero_vad.onnx" }
    }
  ]
}
```

**Bundling policy:** do **not** put the 650 MB+ Parakeet encoder in the installer. Ship `models.json` + Silero VAD (2 MB) as resources; download Parakeet/Whisper on first run into `app_data_dir()/models/` with progress UI, sha256-verify, then cache. Resolve paths at runtime via the Tauri path API.

---

## 5. Cross-platform notes & required permissions

### Windows

- **Toolchain:** MSVC (`x86_64-pc-windows-msvc`) + cmake. `sherpa-onnx`'s `build.rs` auto-downloads `win-x64-static-MT-Release-lib` and statically links (MT runtime) — nothing to install/ship. `provider = "cpu"` by default; `directml`/`cuda` need a separately-supplied lib build.
- **Mic:** WASAPI shared mode; `default_input_config()` typically f32 @ 44.1/48k. The app must have microphone access enabled (Settings → Privacy → Microphone) or the stream returns silence. No Info.plist equivalent.
- **Hotkey CRITICAL (tauri#14770):** in-process `rdevin` keyboard hook stops delivering once the WebView window gains focus (mouse still works). **Run the listener as a separate sidecar process** and forward start/stop over stdio/local socket. A standalone process keeps receiving events regardless of Tauri focus.
- **Injection:** `enigo` uses `SendInput`; no special permission. Injecting into an elevated window from a non-elevated process is blocked by UIPI — match integrity level if driving elevated apps. Tag synthetic events via `windows_dw_extra_info` so your own hook ignores them (avoid feedback loops).
- **Distribution:** NSIS `.exe` (recommended) / MSI. Unsigned installers trigger SmartScreen "unknown publisher" (user can bypass). Signing optional (cert thumbprint / Azure Trusted Signing) — independent of macOS.

### macOS

- **Toolchain:** Xcode Command Line Tools + cmake. `build.rs` auto-downloads `osx-arm64-static` (or `osx-x64`) and static-links. `provider = "coreml"` accelerates the encoder on M-series (first run compiles/caches the CoreML model — slower once); falls back to CPU for unsupported ops.
- **TCC — three distinct permissions:**
  1. **Microphone** — granted by a standard TCC prompt on first capture; requires `NSMicrophoneUsageDescription` in `Info.plist` (the string only customizes the prompt). Sandboxed/hardened builds also need the `com.apple.security.device.audio-input` entitlement.
  2. **Accessibility** — required for `enigo` CGEvent injection (`AXIsProcessTrusted`). **NOT** granted by any Info.plist key — it is a runtime grant the user toggles in System Settings → Privacy & Security → Accessibility. Use `macos-accessibility-client::accessibility::application_is_trusted_with_prompt()` to surface the prompt + show onboarding.
  3. **Input Monitoring** — `rdevin`'s CGEventTap (modifier capture) needs Accessibility (or Input Monitoring for listen-only); `NSInputMonitoringUsageDescription` only customizes prompt text.
- **Sandbox kills it:** under App Sandbox, `AXIsProcessTrusted` always returns false and the prompt never appears. **Ship the dictation build UNSANDBOXED and Developer-ID signed.**
- **Grants are keyed to bundle id + code signature:** dev (`tauri dev`) and release binaries differ, so grant Accessibility again for the release app; re-grant after a signature change; restart the app after granting (Ventura+ caches the value). This is the #1 pain for unsigned dictation apps — **prefer a stable Developer-ID signature**.
- **Injection thread:** run CGEvent injection on the main thread (`app.run_on_main_thread`); `Key::Meta` for Cmd+V; `independent_of_keyboard_state = true` so held Shift/Caps doesn't corrupt synthesized text.
- **`Info.plist`** (merge via `src-tauri/Info.plist`):
  ```xml
  <key>NSMicrophoneUsageDescription</key>
  <string>This app records audio to transcribe your speech.</string>
  <key>NSInputMonitoringUsageDescription</key>
  <string>Used to detect your global dictation hotkey.</string>
  ```
- **Entitlements** (`src-tauri/entitlements.plist`, for notarization + dylib loading):
  ```xml
  <key>com.apple.security.device.audio-input</key><true/>
  <key>com.apple.security.cs.disable-library-validation</key><true/>
  <key>com.apple.security.cs.allow-jit</key><true/>
  ```
  (With static onnxruntime linking you may be able to drop `disable-library-validation`; keep it if any loose dylib remains.)

---

## 6. GitHub Actions CI — `.github/workflows/release.yml`

> You **cannot** cross-compile macOS from Windows. Build macOS on a `macos-14` Apple-silicon runner (universal binary via `--target universal-apple-darwin`, both Rust targets installed for the lipo merge), and Windows on `windows-latest`. Driven by `tauri-apps/tauri-action@v0`. Omit the `APPLE_*` env vars for unsigned/personal builds.

```yaml
name: release
on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          # Universal macOS (Intel + Apple silicon) on an Apple-silicon runner
          - platform: macos-14
            args: '--target universal-apple-darwin'
            rust-targets: 'aarch64-apple-darwin,x86_64-apple-darwin'
          # Windows x64
          - platform: windows-latest
            args: ''
            rust-targets: ''
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.rust-targets }}   # installs BOTH mac targets for lipo

      - uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      # cmake is needed by sherpa-onnx-sys build.rs (libs are auto-downloaded, but cmake must exist)
      - name: Install cmake (macOS)
        if: matrix.platform == 'macos-14'
        run: brew install cmake
      - name: Install cmake (Windows)
        if: matrix.platform == 'windows-latest'
        run: choco install cmake --installargs 'ADD_CMAKE_TO_PATH=System' -y

      - name: Install frontend deps
        run: npm ci

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # --- macOS signing (OMIT all of these for unsigned/personal builds) ---
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}  # "Developer ID Application: Name (TEAMID)"
          # --- macOS notarization (App Store Connect API key method, preferred) ---
          APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
          APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}            # Key ID
          APPLE_API_KEY_PATH: ${{ secrets.APPLE_API_KEY_PATH }}  # path to .p8 written at runtime
          # (Alternative: APPLE_ID / APPLE_PASSWORD[app-specific] / APPLE_TEAM_ID)
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Vowen Clone v__VERSION__'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

> **CI notes:** `macos-latest` now maps to Apple silicon — pin `macos-14`/`macos-15` so it doesn't shift. tauri-action signs+notarizes+staples automatically when `APPLE_*` env vars are present. The input is `uploadUpdaterJson` (not `includeUpdaterJson`). Hardened Runtime + entitlements are required for notarization (incompatible with ad-hoc signing). Provide the `.p8` content as a secret and write it to `APPLE_API_KEY_PATH` in a prior step if needed.

---

## 7. Known risks / open questions

| # | Risk / question | Mitigation |
|---|---|---|
| 1 | **sherpa-onnx VAD API surface unverified.** `vad.flush()`, `ten_vad`, and `num_threads`/`provider` fields on `VadModelConfig` were not confirmed against the crate examples (which use `default()` + assignment). | Run `cargo doc --open` for the pinned `sherpa-onnx` version; build `VadModelConfig` via `default()` + field assignment (done in §3.3); confirm `flush()`/`front()`/`pop()`/`samples()` signatures before relying on them. |
| 2 | **Exact extracted file names.** `encoder.int8.onnx` vs `encoder.onnx`, whisper prefixing. | Extract each tarball once, list files, then lock `files` paths in `models.json` and add real `sha256`. |
| 3 | **Windows hotkey focus bug (tauri#14770).** In-process `rdevin` dies when WebView focuses. | Ship the listener as a separate sidecar binary; IPC start/stop. Plan the sidecar from day one; the `hotkey.rs` core is reusable as the sidecar's `main`. |
| 4 | **`rdevin` maturity.** Single published version `0.1.0`; README warns "subject to extreme change"; macOS CGEventTap/Accessibility + Windows WH_KEYBOARD_LL behavior inherited (not documented) from upstream `rdev`. | Pin exactly to `0.1`. Keep `tauri-plugin-global-shortcut` (Ctrl+Shift+Space combo) as a fallback PTT path that needs no Accessibility and dodges the focus bug. |
| 5 | **Parakeet is offline/non-streaming.** "Live typing" is pseudo-streaming via periodic interim re-decodes + final per VAD segment — interim re-decode of a growing buffer is O(buffer) and can spike CPU. | Cap interim buffer length / interval (200ms throttle in §3.6); consider a streaming Zipformer (`OnlineRecognizer`) if true low-latency is required. |
| 6 | **Parakeet v3 occasional dropped words** (sherpa issue #2605). | Keep a small Whisper as runtime-selectable fallback (wired in §3.6). |
| 7 | **GPU providers.** Default static archive is CPU-only on Windows; `directml`/`cuda` need a separate lib build (`SHERPA_ONNX_LIB_DIR` or `shared` feature). macOS CoreML works with the default archive. | Default to CPU; make provider a user setting; document the GPU lib build path. CoreML first-run compile is slower. |
| 8 | **macOS TCC fragility.** Grants tied to bundle id + signature; unsigned rebuilds lose Accessibility. | Strongly prefer Developer-ID signing for any global-hotkey/event-tap build; show onboarding + open-Settings UI + re-check. Ship unsandboxed. |
| 9 | **Clipboard restore clobbers non-text.** Paste path only round-trips plain text. | Document; offer "don't restore clipboard" toggle, or move to `tauri-plugin-clipboard-x` for multi-format if it matters. |
| 10 | **cpal sample-format coverage.** §3.2 handles F32/I16/U16; current cpal lines can hand back I24/I32. We pinned `0.16` where F32 dominates, but USB/Bluetooth mics vary. | Add I24/I32 match arms (or request an f32 config) if `unsupported sample format` errors appear in the field. |
| 11 | **Resampler latency / non-integer ratios.** `FftFixedIn` 44100→16000 output length is not `CHUNK*ratio`. | Always use the returned Vec length (done); zero-pad the final chunk on `flush` (done). Consider trimming leading delay frames if interim alignment matters. |
| 12 | **Build prerequisites in CI.** `sherpa-onnx-sys` `build.rs` needs cmake present even though it downloads prebuilt libs. | Explicit cmake install steps added to the workflow. |

---

### Summary

This plan builds the Vowen-clone backend on a single statically-linked inference engine — the official k2-fsa `sherpa-onnx` 1.13 crate running NVIDIA Parakeet TDT 0.6B int8 as the primary offline transducer with a small Whisper fallback and Silero VAD for endpointing — wired into a Tauri 2 app across four cooperating threads (UI/main, an `rdevin` Ctrl+Shift hold-to-talk hook that on Windows must run as a sidecar, a real-time `cpal` capture callback that only downmixes to mono and pushes into a lock-free `ringbuf`, and a consumer thread that `rubato`-resamples to 16 kHz, feeds the VAD in strict 512-sample windows, runs offline decodes with periodic interim re-decodes for a live-typing feel, and finally injects text via `enigo` clipboard-paste or direct-type); models are downloaded on first run from the stable k2-fsa `asr-models` GitHub release (Parakeet/Silero/Whisper, all freely redistributable), and CI builds a universal macOS artifact on a `macos-14` runner plus a Windows NSIS build via `tauri-action`, with the plan explicitly carrying forward every adversarial correction (official `sherpa-onnx` not `sherpa-rs`, `rdevin = "0.1"`, cpal-0.16-specific API, `rubato = "0.16"`, config-via-default-then-assign, macOS TCC/sandbox caveats) and flagging the unverified VAD method names and exact model file names as the first things to confirm against `cargo doc` and a real extraction. The file was written to `C:\Users\Usuario\Documents\GitHub\STT\BACKEND-PLAN.md`.

