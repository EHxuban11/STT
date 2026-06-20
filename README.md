# Vowen Clone

A lightweight, voice-first **speech-to-text / dictation** desktop app — a from-scratch clone of [Vowen](https://vowen.ai), built on **Tauri 2 (Rust) + React** so it runs in ~15 MB instead of ~190 MB and works well on low-resource machines.

Hold a global hotkey → speak → the text is transcribed **locally** (NVIDIA Parakeet / Whisper via sherpa-onnx) and inserted into whatever app has focus.

> This is a personal/educational reimplementation. The original Vowen is a commercial product; its trademarks/branding belong to its authors.

---

## Status

| Area | State |
|---|---|
| **Frontend (UI)** | ✅ Complete — all pages cloned (Home, Transcribe, Speech models, Dictionary, Workflows, Configure your AI, Notes, Tones, Settings ×9 tabs), dark mode, persistent state, recording pill, animations. Runs today in the browser via `npm run dev`. |
| **Tauri shell** | ✅ Written — frameless window, system tray, global shortcut, events. ⏳ Needs the Rust toolchain to compile. |
| **Local STT backend** | ✅ Written (sherpa-onnx Parakeet + Whisper + Silero VAD, cpal capture, rdevin hotkey, enigo injection, model downloader). ⏳ Needs toolchain to compile + two one-time API checks (see `BACKEND-PLAN.md` §7). |
| **CI (Win + macOS)** | ✅ `.github/workflows/release.yml` (tauri-action, universal macOS). |

See **`BACKEND-PLAN.md`** for the full architecture, every Rust module, model URLs and the risks/verification list. See **`UI-SPEC.md`** for the UI spec and **`VOWEN-TEARDOWN.md`** for the analysis of the original app.

---

## Architecture

```
React + Vite (src/)              Tauri 2 / Rust (src-tauri/src/)
─────────────────────            ──────────────────────────────
AppLayout, Sidebar, pages/  ◄──► lib.rs     (window, tray, commands, events, session)
store (persisted)                hotkey.rs  (rdevin: hold Ctrl+Shift → "ptt")
RecordingPill / overlay          audio.rs   (cpal capture → mono → ring → rubato 16k)
dictation (events)               stt.rs     (sherpa-onnx Parakeet/Whisper + Silero VAD)
                                 inject.rs  (enigo: paste / direct-type)
                                 models.rs  (download + extract + sha256 verify)
```

**Pipeline:** hold hotkey → mic capture → resample to 16 kHz mono → Silero VAD endpointing → offline ASR (Parakeet TDT 0.6B int8, Whisper fallback) → inject text (clipboard-paste by default).

Models are **not** bundled. On first use the app downloads Parakeet/Whisper from the k2-fsa `asr-models` GitHub release into the app data dir (with progress + sha256 verify). Silero VAD (~2 MB) ships as a resource.

---

## Develop

Prerequisites for the **UI preview** (no native build): Node 18+.

```bash
npm install
npm run dev        # http://localhost:1420  (web preview of the whole UI)
```

In the web preview, press **Ctrl+Shift+Space** to simulate a dictation (shows the recording pill, writes to History, updates stats). Append `?theme=dark` for dark mode, `?seed=1` to preload sample transcriptions.

### Full desktop app (Tauri)

Additional prerequisites (one-time):

- **Rust** — https://rustup.rs (`rustup-init`)
- **Windows:** Visual Studio **C++ Build Tools** (MSVC) + CMake
- **macOS:** Xcode Command Line Tools + CMake (`brew install cmake`)
- WebView2 (preinstalled on Windows 11)

```bash
npm run tauri dev      # run the native app
npm run tauri build    # produce installers
```

> `sherpa-onnx`'s build script auto-downloads a prebuilt **static** ONNX Runtime, so there are no loose DLLs/dylibs to ship — but `cmake` must be on PATH.

---

## Build matrix (CI)

Push a `v*` tag (or run the workflow manually) to build **Windows (NSIS)** and **universal macOS** artifacts via `tauri-action`. macOS signing/notarization is optional — omit the `APPLE_*` secrets for unsigned/personal builds.

---

## Roadmap

- [ ] Compile the Tauri/STT backend once the toolchain is installed; confirm the two flagged sherpa-onnx API names.
- [ ] Wire model download UI to `download_model` + `model-progress` events.
- [ ] Cloud STT providers (Groq, Deepgram, …) and the LLM "enhance" layer.
- [ ] Windows hotkey sidecar process (tauri#14770) for reliable hold-to-talk.
- [ ] macOS permission onboarding (mic + accessibility).
