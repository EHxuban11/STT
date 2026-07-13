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

/// Crea un OfflineRecognizer a partir de un modelo resuelto (transducer o whisper).
pub fn build_recognizer(model: &ResolvedModel, provider: &str) -> Result<OfflineRecognizer> {
    let mut cfg = OfflineRecognizerConfig::default();
    match model {
        ResolvedModel::Transducer { encoder, decoder, joiner, tokens, .. } => {
            cfg.model_config.transducer = OfflineTransducerModelConfig {
                encoder: Some(encoder.to_string_lossy().into_owned()),
                decoder: Some(decoder.to_string_lossy().into_owned()),
                joiner: Some(joiner.to_string_lossy().into_owned()),
            };
            cfg.model_config.tokens = Some(tokens.to_string_lossy().into_owned());
        }
        ResolvedModel::Whisper { encoder, decoder, tokens, .. } => {
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

/// Decodifica de una vez un buffer 16k mono f32.
pub fn transcribe(rec: &OfflineRecognizer, samples: &[f32]) -> String {
    let stream = rec.create_stream();
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

/// Limpieza ligera del dictado: quita muletillas ("um", "uh"…), normaliza espacios
/// y capitaliza la primera letra. Hace que el texto se sienta mucho más pulido.
pub fn clean_text(text: &str) -> String {
    const FILLERS: &[&str] = &["um", "uh", "uhm", "uhh", "hmm", "mm", "mmm", "er", "erm", "ah"];
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
    let hl: Vec<char> = hs.iter().map(|c| c.to_lowercase().next().unwrap_or(*c)).collect();
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
    pub fallback: Option<OfflineRecognizer>,
    pub vad: VoiceActivityDetector,
}

impl Engine {
    pub fn new(
        recognizer: OfflineRecognizer,
        fallback: Option<OfflineRecognizer>,
        vad: VoiceActivityDetector,
    ) -> Self {
        Self {
            recognizer,
            fallback,
            vad,
        }
    }

    /// Reset reusable auxiliary state before a new capture session.
    pub fn reset(&mut self) {
        self.vad.reset();
        self.vad.clear();
    }

    /// Decode one complete 16 kHz mono utterance in a single recognizer call.
    pub fn transcribe_complete(&self, samples: &[f32]) -> String {
        if samples.is_empty() {
            String::new()
        } else {
            transcribe(&self.recognizer, samples)
        }
    }
}
