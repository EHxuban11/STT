// NOTA: algunos nombres de API de sherpa-onnx (VAD: flush/front/pop/samples, y campos
// de VadModelConfig) están marcados en BACKEND-PLAN.md como "verificar con `cargo doc`"
// para la versión fijada antes de confiar en ellos. Construimos los configs vía
// default() + asignación de campos (forma recomendada por los ejemplos del crate).
use anyhow::{anyhow, Result};
use sherpa_onnx::{
    OfflineRecognizer, OfflineRecognizerConfig, OfflineTransducerModelConfig,
    OfflineWhisperModelConfig, SileroVadModelConfig, VadModelConfig, VoiceActivityDetector,
};

use crate::models::ResolvedModel;

pub const VAD_WINDOW: usize = 512; // tamaño de ventana Silero REQUERIDO
pub const SAMPLE_RATE: i32 = 16_000;
const HOTWORDS_SCORE: f32 = 1.5;

/// Runs `f`, returning its result plus how long it took in whole milliseconds.
/// Used to surface per-stage decode latency on the Home history for debugging.
fn timed<T>(f: impl FnOnce() -> T) -> (T, u64) {
    let start = std::time::Instant::now();
    let value = f();
    (value, start.elapsed().as_millis() as u64)
}

/// Crea un OfflineRecognizer a partir de un modelo resuelto (transducer o whisper).
pub fn build_recognizer(
    model: &ResolvedModel,
    provider: &str,
    contextual_biasing: bool,
) -> Result<OfflineRecognizer> {
    let mut cfg = OfflineRecognizerConfig::default();
    match model {
        ResolvedModel::Transducer {
            encoder,
            decoder,
            joiner,
            tokens,
            bpe_vocab,
            ..
        } => {
            cfg.model_config.transducer = OfflineTransducerModelConfig {
                encoder: Some(encoder.to_string_lossy().into_owned()),
                decoder: Some(decoder.to_string_lossy().into_owned()),
                joiner: Some(joiner.to_string_lossy().into_owned()),
            };
            cfg.model_config.tokens = Some(tokens.to_string_lossy().into_owned());
            cfg.model_config.model_type = Some("nemo_transducer".to_string());
            if contextual_biasing {
                let vocab = bpe_vocab
                    .as_ref()
                    .ok_or_else(|| anyhow!("Parakeet tokenizer vocabulary is not installed"))?;
                cfg.model_config.modeling_unit = Some("bpe".to_string());
                cfg.model_config.bpe_vocab = Some(vocab.to_string_lossy().into_owned());
                cfg.decoding_method = Some("modified_beam_search".to_string());
                cfg.max_active_paths = 4;
                cfg.hotwords_score = HOTWORDS_SCORE;
            }
        }
        ResolvedModel::Whisper {
            encoder,
            decoder,
            tokens,
            ..
        } => {
            cfg.model_config.whisper = OfflineWhisperModelConfig {
                encoder: Some(encoder.to_string_lossy().into_owned()),
                decoder: Some(decoder.to_string_lossy().into_owned()),
                language: Some("en".to_string()),
                task: Some("transcribe".to_string()),
                tail_paddings: 0,
                enable_token_timestamps: false,
                enable_segment_timestamps: false,
            };
            cfg.model_config.tokens = Some(tokens.to_string_lossy().into_owned());
        }
        ResolvedModel::Vad { .. } => return Err(anyhow!("VAD model passed to recognizer builder")),
    }
    cfg.model_config.provider = Some(provider.to_string());
    cfg.model_config.num_threads = 2;
    cfg.model_config.debug = false;
    OfflineRecognizer::create(&cfg).ok_or_else(|| anyhow!("recognizer create failed"))
}

pub fn supports_contextual_biasing(model: &ResolvedModel) -> bool {
    matches!(
        model,
        ResolvedModel::Transducer {
            bpe_vocab: Some(_),
            ..
        }
    )
}

/// Contextual decoding is optional. If a platform-specific sherpa build cannot
/// create the modified-beam recognizer, preserve dictation with the normal
/// greedy recognizer and report that contextual biasing is inactive.
pub fn build_recognizer_with_context_fallback(
    model: &ResolvedModel,
    provider: &str,
    contextual_biasing: bool,
) -> Result<(OfflineRecognizer, bool)> {
    let requested = contextual_biasing && supports_contextual_biasing(model);
    if requested {
        match build_recognizer(model, provider, true) {
            Ok(recognizer) => return Ok((recognizer, true)),
            Err(error) => {
                eprintln!(
                    "[stt] contextual recognizer failed; falling back to greedy search: {error}"
                );
            }
        }
    }
    build_recognizer(model, provider, false).map(|recognizer| (recognizer, false))
}

/// One raw phrase per line. sherpa-onnx tokenizes these with the model's own
/// SentencePiece vocabulary when it creates the per-utterance context graph.
pub fn contextual_phrases(terms: &[String]) -> Option<String> {
    let phrases: Vec<&str> = terms
        .iter()
        .map(|term| term.trim())
        .filter(|term| !term.is_empty() && !term.contains(['\r', '\n', '\0']))
        .collect();
    (!phrases.is_empty()).then(|| phrases.join("\n"))
}

/// Decodifica de una vez un buffer 16k mono f32.
pub fn transcribe(
    rec: &OfflineRecognizer,
    samples: &[f32],
    contextual_phrases: Option<&str>,
) -> String {
    let stream = match contextual_phrases.filter(|phrases| !phrases.trim().is_empty()) {
        Some(phrases) => rec.create_stream_with_hotwords(phrases),
        None => rec.create_stream(),
    };
    stream.accept_waveform(SAMPLE_RATE, samples);
    rec.decode(&stream);
    stream.get_result().map(|r| r.text).unwrap_or_default()
}

/// Construye un detector Silero VAD.
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

    VoiceActivityDetector::create(&vad_cfg, 30.0).ok_or_else(|| anyhow!("vad create failed"))
}

/// Uses Silero VAD as a guard before the more permissive modified-beam decoder.
/// This prevents beam search from turning silence into plausible short phrases.
pub fn contains_speech(vad: &VoiceActivityDetector, samples: &[f32]) -> bool {
    vad.reset();
    vad.clear();
    vad.accept_waveform(samples);
    vad.flush();
    let detected = vad.detected() || !vad.is_empty();
    vad.clear();
    vad.reset();
    detected
}

/// Limpieza ligera del dictado: quita muletillas ("um", "uh"…), normaliza espacios
/// y capitaliza la primera letra. Hace que el texto se sienta mucho más pulido.
pub fn clean_text(text: &str) -> String {
    const FILLERS: &[&str] = &[
        "um", "uh", "uhm", "uhh", "hmm", "mm", "mmm", "er", "erm", "ah",
    ];
    let kept: Vec<&str> = text
        .split_whitespace()
        .filter(|w| {
            let bare: String = w
                .chars()
                .filter(|c| c.is_alphanumeric())
                .collect::<String>()
                .to_lowercase();
            !FILLERS.contains(&bare.as_str())
        })
        .collect();

    let mut s = kept.join(" ");

    // Quitar em/en dashes y elipsis (preferencia del usuario: el dictado no los lleva).
    s = s.replace('—', " ").replace('–', " ").replace("--", " ");
    s = s.replace('…', "").replace("...", "");

    // Normalizar puntuación y espacios.
    for (a, b) in [(" ,", ","), (" .", "."), (" ?", "?"), (" !", "!")] {
        s = s.replace(a, b);
    }
    while s.contains("  ") {
        s = s.replace("  ", " ");
    }
    let s = s.trim().to_string();

    // Capitalizar la primera letra.
    let mut chars = s.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => s,
    }
}

/// Aplica el diccionario del usuario: reemplazos "cuando oigas X → escribe Y".
/// Coincidencia por palabra completa, sin distinguir mayúsculas/minúsculas.
pub fn apply_dictionary(text: &str, dict: &[(String, String)]) -> String {
    let mut s = text.to_string();
    for (from, to) in dict {
        if from.trim().is_empty() {
            continue;
        }
        s = replace_word_ci(&s, from, to);
    }
    s
}

fn replace_word_ci(haystack: &str, from: &str, to: &str) -> String {
    // Trabajamos por caracteres (1:1 con su minúscula) para no romper UTF-8.
    let hs: Vec<char> = haystack.chars().collect();
    let hl: Vec<char> = hs
        .iter()
        .map(|c| c.to_lowercase().next().unwrap_or(*c))
        .collect();
    let from_l: Vec<char> = from
        .trim()
        .chars()
        .map(|c| c.to_lowercase().next().unwrap_or(c))
        .collect();
    let (n, m) = (hs.len(), from_l.len());
    if m == 0 {
        return haystack.to_string();
    }
    let is_word = |c: char| c.is_alphanumeric();
    let mut out = String::with_capacity(haystack.len());
    let mut i = 0;
    while i < n {
        if i + m <= n && hl[i..i + m] == from_l[..] {
            let before_ok = i == 0 || !is_word(hs[i - 1]);
            let after_ok = i + m == n || !is_word(hs[i + m]);
            if before_ok && after_ok {
                out.push_str(to);
                i += m;
                continue;
            }
        }
        out.push(hs[i]);
        i += 1;
    }
    out
}

/// Cached speech recognizer and its reusable auxiliary model state.
pub struct Engine {
    pub recognizer: OfflineRecognizer,
    /// Normal greedy Parakeet recognizer used for an A/B comparison while
    /// decoder-time vocabulary biasing is active.
    pub baseline: Option<OfflineRecognizer>,
    pub vad: VoiceActivityDetector,
    contextual_biasing: bool,
}

pub struct CompleteTranscription {
    /// The recognizer output selected for normal app behavior.
    pub selected: String,
    /// Wall-clock decode time of the selected recognizer call, in milliseconds.
    pub selected_ms: u64,
    /// Greedy output from the identical waveform, present only for contextual decoding.
    pub baseline: Option<String>,
    /// Wall-clock decode time of the baseline greedy call, in milliseconds.
    pub baseline_ms: Option<u64>,
}

impl Engine {
    pub fn new(
        recognizer: OfflineRecognizer,
        baseline: Option<OfflineRecognizer>,
        vad: VoiceActivityDetector,
        contextual_biasing: bool,
    ) -> Self {
        Self {
            recognizer,
            baseline,
            vad,
            contextual_biasing,
        }
    }

    /// Reset reusable auxiliary state before a new capture session.
    pub fn reset(&mut self) {
        self.vad.reset();
        self.vad.clear();
    }

    /// Decode one complete 16 kHz mono utterance in a single recognizer call.
    pub fn transcribe_complete(
        &self,
        samples: &[f32],
        vocabulary: &[String],
    ) -> CompleteTranscription {
        if samples.is_empty() {
            CompleteTranscription {
                selected: String::new(),
                selected_ms: 0,
                baseline: None,
                baseline_ms: None,
            }
        } else if self.contextual_biasing && !contains_speech(&self.vad, samples) {
            CompleteTranscription {
                selected: String::new(),
                selected_ms: 0,
                baseline: self.baseline.as_ref().map(|_| String::new()),
                baseline_ms: self.baseline.as_ref().map(|_| 0),
            }
        } else {
            let phrases = self
                .contextual_biasing
                .then(|| contextual_phrases(vocabulary))
                .flatten();
            let (selected, selected_ms) =
                timed(|| transcribe(&self.recognizer, samples, phrases.as_deref()));
            let (baseline, baseline_ms) = match self.baseline.as_ref() {
                Some(recognizer) => {
                    let (text, ms) = timed(|| transcribe(recognizer, samples, None));
                    (Some(text), Some(ms))
                }
                None => (None, None),
            };
            CompleteTranscription {
                selected,
                selected_ms,
                baseline,
                baseline_ms,
            }
        }
    }
}

#[cfg(test)]
mod contextual_biasing_tests {
    use super::*;

    #[test]
    fn contextual_phrases_preserve_user_spelling_and_order() {
        let terms = vec![
            "RF-DETR".to_string(),
            " LibreYOLO ".to_string(),
            "".to_string(),
        ];
        assert_eq!(
            contextual_phrases(&terms).as_deref(),
            Some("RF-DETR\nLibreYOLO")
        );
    }

    #[test]
    fn contextual_phrases_reject_line_injection() {
        let terms = vec!["safe".to_string(), "two\nlines".to_string()];
        assert_eq!(contextual_phrases(&terms).as_deref(), Some("safe"));
    }

    #[test]
    #[ignore = "requires YAWNINGFACE_MODEL_ROOT with an installed Parakeet V2 model"]
    fn creates_a_real_parakeet_contextual_recognizer() {
        let root = std::env::var_os("YAWNINGFACE_MODEL_ROOT")
            .map(std::path::PathBuf::from)
            .expect("set YAWNINGFACE_MODEL_ROOT");
        let catalog = crate::models::Catalog::load(None).expect("embedded catalog");
        let entry = catalog
            .get("parakeet-tdt-0.6b-v2-int8")
            .expect("Parakeet V2")
            .clone();
        tauri::async_runtime::block_on(crate::models::ensure_contextual_biasing_vocab(
            &root, &entry,
        ))
        .expect("contextual vocabulary download");
        let model = crate::models::resolve(&root, &entry).expect("installed Parakeet V2");

        let (recognizer, active) = build_recognizer_with_context_fallback(&model, "cpu", true)
            .expect("create Parakeet recognizer");
        assert!(active, "modified beam search fell back to greedy search");

        // Exercise per-stream raw phrase tokenization and context-graph creation,
        // not just recognizer construction. Silence should decode without text.
        let silence = vec![0.0; SAMPLE_RATE as usize];
        let vad_path = root.join("silero-vad").join("silero_vad.onnx");
        let vad = build_vad(&vad_path.to_string_lossy()).expect("installed Silero VAD");
        let baseline = build_recognizer(&model, "cpu", false).expect("create greedy baseline");
        let engine = Engine::new(recognizer, Some(baseline), vad, true);
        let vocabulary = vec!["LibreYOLO".to_string(), "RF-DETR".to_string()];
        let result = engine.transcribe_complete(&silence, &vocabulary);
        assert!(result.selected.trim().is_empty());
        assert_eq!(result.baseline.as_deref(), Some(""));
    }
}
