mod audio;
mod cerebras;
mod hotkey;
mod inject;
mod media;
mod models;
mod stt;

use audio::{
    flag, is_recording, make_ring, set_recording, start_capture, Capture, RecordingFlag,
    Resampler16k, TARGET_SR,
};
use models::{Catalog, ModelKind, ResolvedModel};
use parking_lot::Mutex;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State,
};

#[derive(Clone, serde::Serialize)]
struct TranscriptEvent {
    text: String,
    interim: bool,
}

#[derive(Clone, serde::Serialize)]
struct AudioCaptureStatsEvent {
    /// Mono frames rejected by the app ring at the microphone's native rate.
    dropped_source_samples: u64,
    source_sample_rate: u32,
    dropped_duration_ms: f64,
    captured_samples_16k: usize,
}

#[derive(Clone, Copy, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
enum InjectMode {
    Paste,
    Type,
    /// No insertar en ninguna app (la página Transcribir solo muestra el texto).
    Off,
}

#[derive(Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
enum DictionaryMode {
    Off,
    Postprocess,
    Cerebras,
}

#[derive(serde::Deserialize)]
struct DictEntry {
    from: String,
    to: String,
}

#[derive(Clone, serde::Serialize)]
struct MediaTranscriptLine {
    time: f32,
    text: String,
}

#[derive(Clone, serde::Serialize)]
struct MediaTranscriptResult {
    path: String,
    file_name: String,
    duration_seconds: f32,
    lines: Vec<MediaTranscriptLine>,
}

#[derive(Clone, serde::Serialize)]
struct WorkflowEvent {
    trigger: String,
    query: String,
    target: String,
}

struct AppState {
    catalog: Catalog,
    /// "Hay una sesión activa" (capturando o finalizando). Se reclama con try_claim.
    recording: RecordingFlag,
    /// "Se ha pedido parar la captura" (lo activa stop_session; el hilo lo observa).
    stop_req: RecordingFlag,
    capture: Mutex<Option<Capture>>,
    /// Motor STT cacheado: se carga una vez y se reutiliza entre dictados.
    engine: Mutex<Option<stt::Engine>>,
    primary_id: Mutex<String>,
    fallback_id: Mutex<Option<String>>,
    vad_id: Mutex<String>,
    provider: Mutex<String>,
    inject_mode: Mutex<InjectMode>,
    dictionary_mode: Mutex<DictionaryMode>,
    cerebras: Mutex<cerebras::Config>,
    /// Diccionario del usuario: pares (cuando oigas, escribe) aplicados a cada dictado.
    dictionary: Mutex<Vec<(String, String)>>,
    workflows_enabled: Mutex<HashMap<String, bool>>,
}

fn provider_default() -> String {
    if cfg!(target_os = "macos") {
        "coreml".into()
    } else {
        "cpu".into()
    }
}

fn initial_primary_id(catalog: &Catalog, root: Option<&Path>) -> String {
    const ORDER: [&str; 4] = [
        "parakeet-tdt-0.6b-v3-int8",
        "parakeet-tdt-0.6b-v2-int8",
        "whisper-base.en",
        "whisper-tiny.en",
    ];

    if let Some(root) = root {
        if let Some(id) = ORDER.iter().copied().find(|id| {
            catalog
                .get(id)
                .and_then(|entry| models::resolve(root, entry))
                .is_some()
        }) {
            return id.to_string();
        }
    }

    ORDER[0].to_string()
}

fn has_installed_speech_model(catalog: &Catalog, root: &Path) -> bool {
    catalog.models.iter().any(|entry| {
        entry.kind != ModelKind::Vad && models::resolve(root, entry).is_some()
    })
}

#[tauri::command]
fn get_app_info() -> serde_json::Value {
    serde_json::json!({ "name": "Yawning Face STT", "version": env!("CARGO_PKG_VERSION") })
}

/// Cierra la app de verdad (sale del proceso, no solo a la bandeja).
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// Esconde la ventana principal a la bandeja (la app sigue corriendo).
#[tauri::command]
fn hide_main(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
}

fn open_url(url: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = Command::new("rundll32.exe");
        c.arg("url.dll,FileProtocolHandler").arg(url);
        c
    };

    #[cfg(target_os = "macos")]
    let mut cmd = {
        let mut c = Command::new("open");
        c.arg(url);
        c
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut cmd = {
        let mut c = Command::new("xdg-open");
        c.arg(url);
        c
    };

    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open URL: {e}"))
}

fn open_path(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = Command::new("explorer.exe");
        c.arg(path);
        c
    };

    #[cfg(target_os = "macos")]
    let mut cmd = {
        let mut c = Command::new("open");
        c.arg(path);
        c
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut cmd = {
        let mut c = Command::new("xdg-open");
        c.arg(path);
        c
    };

    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open path: {e}"))
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let allowed = "https://github.com/EHxuban11/STT/issues/";
    if !url.starts_with(allowed) || url.chars().any(char::is_whitespace) {
        return Err("Unsupported external URL".into());
    }

    open_url(&url)
}

#[tauri::command]
fn list_models(state: State<'_, Arc<AppState>>) -> Vec<models::ModelEntry> {
    state.catalog.models.clone()
}

/// Ids de los modelos que están realmente descargados (todos sus ficheros en disco).
#[tauri::command]
fn list_installed_models(app: AppHandle, state: State<'_, Arc<AppState>>) -> Vec<String> {
    let root = match app.path().app_data_dir() {
        Ok(d) => d.join("models"),
        Err(_) => return Vec::new(),
    };
    state
        .catalog
        .models
        .iter()
        .filter(|e| models::resolve(&root, e).is_some())
        .map(|e| e.id.clone())
        .collect()
}

#[tauri::command]
fn set_inject_mode(state: State<'_, Arc<AppState>>, mode: InjectMode) {
    *state.inject_mode.lock() = mode;
}

#[tauri::command]
fn set_dictionary_mode(state: State<'_, Arc<AppState>>, mode: DictionaryMode) {
    *state.dictionary_mode.lock() = mode;
}

#[tauri::command]
fn get_cerebras_status() -> Result<cerebras::KeyStatus, String> {
    cerebras::status().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_cerebras_api_key(api_key: String) -> Result<cerebras::KeyStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        cerebras::save_api_key(&api_key).map_err(|e| e.to_string())
    })
    .await
    .map_err(|_| "Cerebras key verification was interrupted".to_string())?
}

#[tauri::command]
async fn test_cerebras_connection() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        cerebras::test_connection().map_err(|e| e.to_string())
    })
    .await
    .map_err(|_| "Cerebras connection test was interrupted".to_string())??;
    Ok("Connected to Cerebras".to_string())
}

#[tauri::command]
async fn clear_cerebras_api_key() -> Result<cerebras::KeyStatus, String> {
    tauri::async_runtime::spawn_blocking(|| {
        cerebras::clear_api_key().map_err(|e| e.to_string())
    })
    .await
    .map_err(|_| "Cerebras key removal was interrupted".to_string())?
}

#[tauri::command]
fn set_cerebras_config(
    state: State<'_, Arc<AppState>>,
    model: String,
    context: String,
) -> Result<(), String> {
    let config = cerebras::Config::normalized(model, context).map_err(|e| e.to_string())?;
    *state.cerebras.lock() = config;
    Ok(())
}

/// Reemplaza el diccionario del usuario (se aplica a cada dictado antes de insertar).
#[tauri::command]
fn set_dictionary(state: State<'_, Arc<AppState>>, entries: Vec<DictEntry>) {
    *state.dictionary.lock() = entries
        .into_iter()
        .filter(|e| !e.from.trim().is_empty())
        .map(|e| (e.from, e.to))
        .collect();
}

#[tauri::command]
fn set_workflows_enabled(state: State<'_, Arc<AppState>>, workflows: HashMap<String, bool>) {
    *state.workflows_enabled.lock() = workflows;
}

fn apply_dictionary_for_mode(
    text: &str,
    dict: &[(String, String)],
    mode: DictionaryMode,
) -> String {
    match mode {
        DictionaryMode::Off | DictionaryMode::Cerebras => text.to_string(),
        DictionaryMode::Postprocess => stt::apply_dictionary(text, dict),
    }
}

// Built-in spoken workflows: "google cats", "youtube song", "open downloads", etc.
fn url_encode(input: &str) -> String {
    let mut out = String::new();
    for b in input.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            b' ' => out.push('+'),
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

fn clean_workflow_query(input: &str) -> String {
    input
        .trim()
        .trim_start_matches(|c: char| {
            c.is_whitespace() || matches!(c, ':' | ',' | '-' | '.' | ';' | '?' | '!')
        })
        .trim()
        .trim_end_matches(|c: char| matches!(c, '.' | '?' | '!' | ',' | ';' | ':'))
        .trim()
        .to_string()
}

fn query_for_trigger(text: &str, trigger: &str) -> Option<String> {
    let trimmed = text.trim();
    let lower = trimmed.to_lowercase();

    if lower == trigger {
        return Some(String::new());
    }
    if !lower.starts_with(trigger) {
        return None;
    }

    let rest_lower = &lower[trigger.len()..];
    let first = rest_lower.chars().next()?;
    if !(first.is_whitespace() || matches!(first, ':' | ',' | '-' | '.' | ';' | '?' | '!')) {
        return None;
    }

    Some(clean_workflow_query(&trimmed[trigger.len()..]))
}

fn workflow_enabled(enabled: &HashMap<String, bool>, trigger: &str) -> bool {
    enabled.get(trigger).copied().unwrap_or(true)
}

fn open_folder_for_workflow(app: &AppHandle, query: &str) -> Result<String, String> {
    let q = query.to_lowercase();
    let path = if q.is_empty() || q.contains("home") {
        app.path()
            .home_dir()
            .map_err(|e| format!("Could not locate home folder: {e}"))?
    } else if q.contains("download") || q.contains("descarga") {
        app.path()
            .download_dir()
            .map_err(|e| format!("Could not locate downloads folder: {e}"))?
    } else if q.contains("document") || q.contains("documento") {
        app.path()
            .document_dir()
            .map_err(|e| format!("Could not locate documents folder: {e}"))?
    } else if q.contains("desktop") || q.contains("escritorio") {
        app.path()
            .desktop_dir()
            .map_err(|e| format!("Could not locate desktop folder: {e}"))?
    } else if q.contains("screenshot") || q.contains("captura") {
        let pictures = app
            .path()
            .picture_dir()
            .map_err(|e| format!("Could not locate pictures folder: {e}"))?;
        let screenshots = pictures.join("Screenshots");
        if screenshots.exists() {
            screenshots
        } else {
            pictures
        }
    } else if q.contains("picture")
        || q.contains("image")
        || q.contains("photo")
        || q.contains("foto")
        || q.contains("imagen")
    {
        app.path()
            .picture_dir()
            .map_err(|e| format!("Could not locate pictures folder: {e}"))?
    } else {
        return Err(format!("Unknown folder workflow target: {query}"));
    };

    let target = path.display().to_string();
    open_path(&path)?;
    Ok(target)
}

fn run_workflow_if_enabled(
    app: &AppHandle,
    state: &Arc<AppState>,
    text: &str,
) -> Result<Option<WorkflowEvent>, String> {
    let enabled = state.workflows_enabled.lock().clone();

    let url_workflows = [
        ("ask chat gpt", "https://chatgpt.com/", "https://chatgpt.com/?q="),
        ("ask claude", "https://claude.ai/new", "https://claude.ai/new?q="),
        (
            "ask perplexity",
            "https://www.perplexity.ai/",
            "https://www.perplexity.ai/search?q=",
        ),
        ("duck duck go", "https://duckduckgo.com/", "https://duckduckgo.com/?q="),
        (
            "youtube",
            "https://www.youtube.com/",
            "https://www.youtube.com/results?search_query=",
        ),
        ("google", "https://www.google.com/", "https://www.google.com/search?q="),
    ];

    for (trigger, home_url, query_url) in url_workflows {
        let Some(query) = query_for_trigger(text, trigger) else {
            continue;
        };
        if !workflow_enabled(&enabled, trigger) {
            return Ok(None);
        }

        let target = if query.is_empty() {
            home_url.to_string()
        } else {
            format!("{}{}", query_url, url_encode(&query))
        };
        open_url(&target)?;
        return Ok(Some(WorkflowEvent {
            trigger: trigger.to_string(),
            query,
            target,
        }));
    }

    if let Some(query) = query_for_trigger(text, "open") {
        if !workflow_enabled(&enabled, "open") {
            return Ok(None);
        }

        let target = open_folder_for_workflow(app, &query)?;
        return Ok(Some(WorkflowEvent {
            trigger: "open".to_string(),
            query,
            target,
        }));
    }

    Ok(None)
}

#[tauri::command]
fn start_recording(app: AppHandle, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    start_session(&app, &state)
}

#[tauri::command]
fn stop_recording(app: AppHandle, state: State<'_, Arc<AppState>>) {
    stop_session(&app, &state);
}

/// Cambia el modelo de voz activo: actualiza el id primario, invalida el motor cacheado
/// y lo re-calienta en segundo plano con el nuevo modelo.
#[tauri::command]
fn set_active_model(app: AppHandle, state: State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    if state.catalog.get(&id).is_none() {
        return Err(format!("unknown model id: {id}"));
    }

    *state.primary_id.lock() = id.clone();
    *state.engine.lock() = None; // invalidar caché (el actual es del modelo anterior)

    let state2: Arc<AppState> = (*state).clone();
    let app2 = app.clone();
    let target_id = id.clone();
    std::thread::spawn(move || {
        if let Ok(root) = app2.path().app_data_dir().map(|d| d.join("models")) {
            if let Some(e) = build_engine_for_primary(&state2, &root, &target_id) {
                if *state2.primary_id.lock() == target_id {
                    *state2.engine.lock() = Some(e);
                }
                eprintln!("[stt] engine re-warmed for new active model");
            }
        }
    });
    Ok(())
}

#[tauri::command]
async fn download_model(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    id: String,
) -> Result<(), String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?.join("models");
    let entry = state.catalog.get(&id).ok_or("unknown model id")?.clone();
    let app2 = app.clone();
    let progress_id = id.clone();
    models::ensure_downloaded(&root, &entry, move |done, total| {
        let _ = app2.emit(
            "model-progress",
            serde_json::json!({ "id": progress_id, "done": done, "total": total }),
        );
    })
    .await
    .map_err(|e| e.to_string())?;

    let vad_id = state.vad_id.lock().clone();
    if id != vad_id {
        let vad_entry = state
            .catalog
            .get(&vad_id)
            .ok_or("unknown vad model id")?
            .clone();
        let app3 = app.clone();
        let vad_progress_id = vad_id.clone();
        models::ensure_downloaded(&root, &vad_entry, move |done, total| {
            let _ = app3.emit(
                "model-progress",
                serde_json::json!({ "id": vad_progress_id, "done": done, "total": total }),
            );
        })
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn transcribe_media_file(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    path: String,
) -> Result<MediaTranscriptResult, String> {
    let state2: Arc<AppState> = (*state).clone();
    let root = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models");
    let path_buf = PathBuf::from(path);

    tauri::async_runtime::spawn_blocking(move || {
        transcribe_media_file_blocking(&state2, &root, path_buf).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn transcribe_media_file_blocking(
    state: &Arc<AppState>,
    root: &Path,
    path: PathBuf,
) -> anyhow::Result<MediaTranscriptResult> {
    let decoded = media::decode_to_16k_mono(&path)?;
    let provider = state.provider.lock().clone();
    let primary_id = state.primary_id.lock().clone();
    let model_entry = state
        .catalog
        .get(&primary_id)
        .ok_or_else(|| anyhow::anyhow!("Unknown active speech model"))?;
    let model = models::resolve(root, model_entry)
        .ok_or_else(|| anyhow::anyhow!("Download the active speech model before transcribing files"))?;
    let recognizer = stt::build_recognizer(&model, &provider)?;
    let dict = state.dictionary.lock().clone();
    let dictionary_mode = *state.dictionary_mode.lock();

    let sample_rate = stt::SAMPLE_RATE as usize;
    let chunk_len = sample_rate * 12;
    let mut lines = Vec::new();

    for (idx, chunk) in decoded.samples_16k.chunks(chunk_len).enumerate() {
        if chunk.len() < sample_rate / 2 {
            continue;
        }
        let raw = stt::transcribe(&recognizer, chunk);
        let cleaned = stt::clean_text(&raw);
        let text = apply_dictionary_for_mode(&cleaned, &dict, dictionary_mode);
        if !text.trim().is_empty() {
            lines.push(MediaTranscriptLine {
                time: (idx * chunk_len) as f32 / sample_rate as f32,
                text,
            });
        }
    }

    Ok(MediaTranscriptResult {
        file_name: path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("Selected file")
            .to_string(),
        path: path.to_string_lossy().into_owned(),
        duration_seconds: decoded.duration_seconds,
        lines,
    })
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn show_pill(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("pill") {
        // Re-afirmar always-on-top al mostrar: en Windows la isla puede perder el
        // nivel "topmost" y quedar tapada por otras ventanas (p. ej. PowerShell).
        let _ = w.set_always_on_top(true);
        let _ = w.show();
    }
}

fn hide_pill(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("pill") {
        let _ = w.hide();
    }
}

/// Muestra la isla con un mensaje breve (p. ej. "No microphone detected") y la
/// esconde tras unos segundos. Se usa cuando no se puede iniciar la captura.
fn show_pill_message(app: &AppHandle, message: &str) {
    show_pill(app);
    let _ = app.emit("pill-message", message.to_string());
    let app2 = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(2800));
        hide_pill(&app2);
    });
}

/// Nivel RMS (0..1) de un bloque de muestras, para el medidor de la isla.
fn rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum: f32 = samples.iter().map(|x| x * x).sum();
    (sum / samples.len() as f32).sqrt()
}

/// Construye el motor STT (recognizer + VAD) si los modelos están descargados.
/// Es lento (carga los ONNX en memoria) — por eso lo cacheamos y reutilizamos.
fn build_engine(state: &Arc<AppState>, root: &Path) -> Option<stt::Engine> {
    let primary_id = state.primary_id.lock().clone();
    build_engine_for_primary(state, root, &primary_id)
}

fn build_engine_for_primary(state: &Arc<AppState>, root: &Path, primary_id: &str) -> Option<stt::Engine> {
    let resolve_id =
        |id: &str| -> Option<ResolvedModel> { state.catalog.get(id).and_then(|e| models::resolve(root, e)) };
    let provider = state.provider.lock().clone();
    let primary = resolve_id(primary_id)?;
    let vad_model = match resolve_id(&state.vad_id.lock())? {
        ResolvedModel::Vad { model } => model,
        _ => return None,
    };
    let recognizer = stt::build_recognizer(&primary, &provider).ok()?;
    let fb = state
        .fallback_id
        .lock()
        .as_ref()
        .and_then(|id| resolve_id(id))
        .and_then(|m| stt::build_recognizer(&m, &provider).ok());
    let vad = stt::build_vad(&vad_model.to_string_lossy()).ok()?;
    Some(stt::Engine::new(recognizer, fb, vad))
}

/// Inicia una sesión: reclama la grabación de forma atómica, muestra la isla flotante,
/// captura audio y (si hay modelo) transcribe e inserta el texto al soltar.
/// El motor se carga UNA vez y se reutiliza. La grabación se libera al terminar el hilo.
fn start_session(app: &AppHandle, state: &Arc<AppState>) -> Result<(), String> {
    // Reclamo atómico: si ya hay una sesión (capturando o finalizando), ignorar.
    if !audio::try_claim(&state.recording) {
        return Ok(());
    }
    set_recording(&state.stop_req, false);

    let root = match app.path().app_data_dir() {
        Ok(d) => d.join("models"),
        Err(e) => {
            set_recording(&state.recording, false);
            return Err(e.to_string());
        }
    };

    let session_model_id = state.primary_id.lock().clone();

    // Reutilizar el motor cacheado; construirlo la primera vez (lento solo esa vez).
    let mut engine = state.engine.lock().take();
    if engine.is_none() {
        engine = build_engine(state, &root);
    }
    // Sin modelo descargado: avisar y NO grabar (evita falsa sensación de éxito).
    if engine.is_none() {
        eprintln!("[stt] no model downloaded");
        let _ = app.emit("no-model", "Download a speech model to start dictating.");
        set_recording(&state.recording, false);
        return Ok(());
    }
    if let Some(e) = engine.as_mut() {
        e.reset();
    }

    let (prod, mut cons) = make_ring();
    let capture = match start_capture(prod) {
        Ok(c) => c,
        Err(e) => {
            *state.engine.lock() = engine; // devolver el motor a la caché
            set_recording(&state.recording, false);
            // Sin captura: lo más habitual es que no haya micrófono. Avisar en la isla.
            eprintln!("[audio] capture failed: {e}");
            show_pill_message(app, "No microphone detected");
            return Ok(());
        }
    };
    let src_sr = capture.src_sr;
    let dropped_samples = capture.dropped_samples.clone();
    *state.capture.lock() = Some(capture);

    show_pill(app);
    let _ = app.emit("state", "recording");

    let recording = state.recording.clone();
    let stop_req = state.stop_req.clone();
    let app2 = app.clone();
    let state2 = state.clone();

    std::thread::spawn(move || {
        let engine = engine;
        let mut resampler = Resampler16k::new(src_sr).ok();
        let mut scratch = Vec::with_capacity(8192);
        let mut utterance_16k = Vec::with_capacity(TARGET_SR * 30);

        while !is_recording(&stop_req) {
            let n = audio::drain_into(&mut cons, &mut scratch);
            if n == 0 {
                std::thread::sleep(Duration::from_millis(8));
                continue;
            }
            // Nivel de audio (RMS) para la isla flotante.
            let _ = app2.emit("audio-level", rms(&scratch));

            // Capture only: resample and retain the utterance. ASR runs once after release.
            if let Some(rs) = resampler.as_mut() {
                if let Err(e) = rs.push(&scratch, &mut utterance_16k) {
                    eprintln!("[audio] resampling failed: {e}");
                }
            }
        }

        // The producer has stopped before stop_req is published. Drain every queued frame,
        // then flush the resampler so the decoder receives one complete utterance.
        if audio::drain_into(&mut cons, &mut scratch) > 0 {
            if let Some(rs) = resampler.as_mut() {
                if let Err(e) = rs.push(&scratch, &mut utterance_16k) {
                    eprintln!("[audio] final resampling failed: {e}");
                }
            }
        }
        if let Some(rs) = resampler.as_mut() {
            if let Err(e) = rs.flush(&mut utterance_16k) {
                eprintln!("[audio] resampler flush failed: {e}");
            }
        }

        let dropped_source_samples = dropped_samples.load(Ordering::Relaxed);
        let dropped_duration_ms = dropped_source_samples as f64 * 1_000.0 / f64::from(src_sr);
        let capture_stats = AudioCaptureStatsEvent {
            dropped_source_samples,
            source_sample_rate: src_sr,
            dropped_duration_ms,
            captured_samples_16k: utterance_16k.len(),
        };
        eprintln!(
            "[audio] capture complete: dropped_source_samples={}, source_sample_rate={}, dropped_duration_ms={:.2}, captured_samples_16k={}",
            capture_stats.dropped_source_samples,
            capture_stats.source_sample_rate,
            capture_stats.dropped_duration_ms,
            capture_stats.captured_samples_16k,
        );
        let _ = app2.emit("audio-capture-stats", capture_stats);

        // Exactly one full-utterance recognition call; empty captures do not invoke ASR.
        let raw = engine
            .as_ref()
            .map(|eng| eng.transcribe_complete(&utterance_16k))
            .unwrap_or_default();
        let cleaned = stt::clean_text(&raw);
        let dict = state2.dictionary.lock().clone();
        let dictionary_mode = *state2.dictionary_mode.lock();
        // Workflows use deterministic local text. In Cerebras mode that is the untouched cleaned
        // ASR result, so neither a cloud response nor an unconditional dictionary replacement can
        // manufacture an actionable command.
        let workflow_text = apply_dictionary_for_mode(&cleaned, &dict, dictionary_mode);

        // Devolver el motor a la caché (sin recargar el modelo la próxima vez).
        if *state2.primary_id.lock() == session_model_id {
            *state2.engine.lock() = engine;
        }

        if !workflow_text.is_empty() {
            // Workflows are detected only from deterministic local text. A cloud response is
            // never allowed to manufacture an actionable workflow command.
            let workflow_handled = match run_workflow_if_enabled(&app2, &state2, &workflow_text) {
                Ok(Some(event)) => {
                    let _ = app2.emit("workflow-triggered", event);
                    true
                }
                Ok(None) => false,
                Err(e) => {
                    eprintln!("[workflow] {e}");
                    let _ = app2.emit("workflow-error", e);
                    true
                }
            };

            // When Cerebras is unavailable, keep raw local ASR. Exact mode remains available for
            // users who explicitly want unconditional substitutions.
            let mut final_text = if dictionary_mode == DictionaryMode::Cerebras {
                cleaned.clone()
            } else {
                workflow_text
            };
            if !workflow_handled && dictionary_mode == DictionaryMode::Cerebras {
                let config = state2.cerebras.lock().clone();
                // Give Cerebras the untouched cleaned ASR result so it can decide whether an
                // exact dictionary phrase is actually the intended term in this context.
                match cerebras::cleanup_transcription(&config, &cleaned, &dict) {
                    Ok(corrected) => final_text = corrected,
                    Err(e) => {
                        eprintln!("[cerebras] {e}");
                        let _ = app2.emit(
                            "cerebras-fallback",
                            "Cerebras was unavailable, so the local transcription was used.",
                        );
                    }
                }
            }

            if !workflow_handled {
                let mode = *state2.inject_mode.lock();
                let result = match mode {
                    InjectMode::Paste => inject::insert_via_paste(&app2, &final_text),
                    InjectMode::Type => inject::insert_via_typing(&final_text),
                    InjectMode::Off => Ok(()), // Transcribir: no insertar, solo mostrar.
                };
                if let Err(e) = result {
                    eprintln!("[inject] {e}");
                }
            }
            let _ = app2.emit(
                "transcript",
                TranscriptEvent {
                    text: final_text,
                    interim: false,
                },
            );
        }
        hide_pill(&app2);
        let _ = app2.emit("state", "idle");
        // Liberar la grabación como ÚLTIMO paso (impide solapar una nueva sesión durante el finalize).
        set_recording(&recording, false);
    });

    Ok(())
}

fn stop_session(app: &AppHandle, state: &Arc<AppState>) {
    if !is_recording(&state.recording) {
        return;
    }
    // Quiesce and drop the producer before publishing EOF to the worker. Once it observes
    // stop_req, no callback can add more frames while it performs the final ring drain.
    let capture = state.capture.lock().take();
    if let Some(capture) = capture {
        capture.stop();
    }
    set_recording(&state.stop_req, true);
    // The session remains claimed while final ASR and optional cloud correction run, so keep a
    // visible processing state until it is actually ready for the next hotkey press.
    let _ = app.emit("state", "transcribing");
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Yawning Face", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let stop = MenuItem::with_id(app, "stop", "Stop Recording", true, None::<&str>)?;
    let copy_last = MenuItem::with_id(app, "copy_last", "Copy Last Transcription", true, None::<&str>)?;
    let transcribe_file = MenuItem::with_id(app, "transcribe_file", "Transcribe File", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Yawning Face", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&open, &sep1, &stop, &copy_last, &transcribe_file, &sep2, &settings, &sep3, &quit],
    )?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Yawning Face STT")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "settings" => {
                show_main(app);
                let _ = app.emit("navigate", "/settings");
            }
            "stop" => {
                if let Some(state) = app.try_state::<Arc<AppState>>() {
                    stop_session(app, &state);
                }
            }
            "copy_last" => {
                let _ = app.emit("tray-action", "copy_last");
            }
            "transcribe_file" => {
                show_main(app);
                let _ = app.emit("navigate", "/transcribe");
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    // La app sigue viva en la bandeja para que el atajo global funcione.
                    // No escondemos aquí: avisamos al frontend, que muestra el aviso de
                    // primer cierre (una sola vez) y luego esconde la ventana.
                    api.prevent_close();
                    let _ = window.emit("main-close-requested", ());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            quit_app,
            hide_main,
            open_external_url,
            list_models,
            list_installed_models,
            set_inject_mode,
            set_dictionary_mode,
            get_cerebras_status,
            save_cerebras_api_key,
            test_cerebras_connection,
            clear_cerebras_api_key,
            set_cerebras_config,
            set_dictionary,
            set_workflows_enabled,
            start_recording,
            stop_recording,
            set_active_model,
            download_model,
            transcribe_media_file
        ])
        .setup(move |app| {
            // Catálogo de modelos (resource o embebido).
            let catalog_path = app
                .path()
                .resolve("models.json", tauri::path::BaseDirectory::Resource)
                .ok();
            let catalog = Catalog::load(catalog_path.as_deref()).expect("load catalog");

            // Log de la carpeta de modelos (para colocar los .onnx en la ruta correcta).
            let models_root = app.path().app_data_dir().ok().map(|dir| dir.join("models"));
            if let Some(root) = models_root.as_ref() {
                eprintln!("[models] dir = {}", root.display());
            }
            let primary_id = initial_primary_id(&catalog, models_root.as_deref());

            let state = Arc::new(AppState {
                catalog,
                recording: flag(false),
                stop_req: flag(false),
                capture: Mutex::new(None),
                engine: Mutex::new(None),
                primary_id: Mutex::new(primary_id),
                fallback_id: Mutex::new(None),
                vad_id: Mutex::new("silero-vad".into()),
                provider: Mutex::new(provider_default()),
                inject_mode: Mutex::new(InjectMode::Paste),
                dictionary_mode: Mutex::new(DictionaryMode::Postprocess),
                cerebras: Mutex::new(cerebras::Config::default()),
                dictionary: Mutex::new(Vec::new()),
                workflows_enabled: Mutex::new(HashMap::new()),
            });
            app.manage(state.clone());

            if let Some(root) = models_root.clone() {
                let state_vad = state.clone();
                let app_vad = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if !has_installed_speech_model(&state_vad.catalog, &root) {
                        return;
                    }
                    let vad_id = state_vad.vad_id.lock().clone();
                    let Some(vad_entry) = state_vad.catalog.get(&vad_id).cloned() else {
                        return;
                    };
                    if models::resolve(&root, &vad_entry).is_some() {
                        return;
                    }
                    let progress_id = vad_id.clone();
                    let app_progress = app_vad.clone();
                    match models::ensure_downloaded(&root, &vad_entry, move |done, total| {
                        let _ = app_progress.emit(
                            "model-progress",
                            serde_json::json!({ "id": progress_id, "done": done, "total": total }),
                        );
                    })
                    .await
                    {
                        Ok(_) => {
                            eprintln!("[models] vad installed");
                            if state_vad.engine.lock().is_none() {
                                if let Some(e) = build_engine(&state_vad, &root) {
                                    *state_vad.engine.lock() = Some(e);
                                    eprintln!("[stt] engine pre-warmed after vad install");
                                }
                            }
                        }
                        Err(e) => eprintln!("[models] vad install failed: {e}"),
                    }
                });
            }

            // Pre-cargar el motor en segundo plano (si el modelo ya está descargado),
            // para que la PRIMERA pulsación del atajo también sea instantánea.
            {
                let state_pw = state.clone();
                let app_pw = app.handle().clone();
                std::thread::spawn(move || {
                    if let Ok(root) = app_pw.path().app_data_dir().map(|d| d.join("models")) {
                        if state_pw.engine.lock().is_none() {
                            if let Some(e) = build_engine(&state_pw, &root) {
                                *state_pw.engine.lock() = Some(e);
                                eprintln!("[stt] engine pre-warmed");
                            }
                        }
                    }
                });
            }

            // Bandeja del sistema.
            build_tray(app.handle())?;

            // Isla flotante de grabación: ventana transparente, always-on-top, sin marco,
            // oculta hasta que se graba. Se posiciona arriba-centro de la pantalla.
            if let Ok(pill) = tauri::WebviewWindowBuilder::new(
                app,
                "pill",
                tauri::WebviewUrl::App("index.html#/pill".into()),
            )
            .title("")
            .inner_size(300.0, 76.0)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .shadow(false)
            .focused(false)
            .visible(false)
            .build()
            {
                if let Ok(Some(mon)) = pill.primary_monitor() {
                    let sz = mon.size();
                    let scale = mon.scale_factor();
                    let win_w = 300.0 * scale;
                    let x = ((sz.width as f64) - win_w) / 2.0;
                    let y = 28.0 * scale;
                    let _ = pill.set_position(tauri::PhysicalPosition::new(x, y));
                }
            }

            // Hotkey de bajo nivel: mantener Ctrl+Shift inicia dictado; soltarlo lo para.
            let app_handle = app.handle().clone();
            let state_for_hotkey = state.clone();
            let (ptt_tx, ptt_rx) = crossbeam_channel::unbounded();
            hotkey::spawn_ptt_listener(move |event| {
                let _ = ptt_tx.send(event);
            });
            std::thread::spawn(move || {
                for event in ptt_rx {
                    match event {
                        hotkey::PttEvent::Start => {
                            if let Err(e) = start_session(&app_handle, &state_for_hotkey) {
                                eprintln!("start: {e}");
                            }
                        }
                        hotkey::PttEvent::Stop => {
                            stop_session(&app_handle, &state_for_hotkey);
                        }
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
