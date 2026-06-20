mod audio;
mod hotkey;
mod inject;
mod models;
mod stt;

use audio::{
    flag, is_recording, make_ring, set_recording, start_capture, Capture, RecordingFlag,
    Resampler16k, TARGET_SR,
};
use models::{Catalog, ResolvedModel};
use parking_lot::Mutex;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Listener, Manager, State,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[derive(Clone, serde::Serialize)]
struct TranscriptEvent {
    text: String,
    interim: bool,
}

#[derive(Clone, Copy, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
enum InjectMode {
    Paste,
    Type,
}

struct AppState {
    catalog: Catalog,
    recording: RecordingFlag,
    capture: Mutex<Option<Capture>>,
    primary_id: Mutex<String>,
    fallback_id: Mutex<Option<String>>,
    vad_id: Mutex<String>,
    provider: Mutex<String>,
    inject_mode: Mutex<InjectMode>,
}

fn provider_default() -> String {
    if cfg!(target_os = "macos") {
        "coreml".into()
    } else {
        "cpu".into()
    }
}

#[tauri::command]
fn get_app_info() -> serde_json::Value {
    serde_json::json!({ "name": "Vowen", "version": env!("CARGO_PKG_VERSION") })
}

#[tauri::command]
fn list_models(state: State<'_, Arc<AppState>>) -> Vec<models::ModelEntry> {
    state.catalog.models.clone()
}

#[tauri::command]
fn set_inject_mode(state: State<'_, Arc<AppState>>, mode: InjectMode) {
    *state.inject_mode.lock() = mode;
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
    models::ensure_downloaded(&root, &entry, move |done, total| {
        let _ = app2.emit(
            "model-progress",
            serde_json::json!({ "id": id, "done": done, "total": total }),
        );
    })
    .await
    .map(|_| ())
    .map_err(|e| e.to_string())
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Inicia una sesión de grabación: resuelve modelos, construye el motor y lanza el hilo consumidor.
fn start_session(app: &AppHandle, state: &Arc<AppState>) -> Result<(), String> {
    if is_recording(&state.recording) {
        return Ok(());
    }
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
    let fb = fallback
        .as_ref()
        .map(|m| stt::build_recognizer(m, &provider))
        .transpose()
        .map_err(|e| e.to_string())?;
    let vad = stt::build_vad(&vad_model.to_string_lossy()).map_err(|e| e.to_string())?;
    let mut engine = stt::Engine::new(recognizer, fb, vad);

    let (prod, mut cons) = make_ring();
    let capture = start_capture(prod).map_err(|e| e.to_string())?;
    let src_sr = capture.src_sr;
    *state.capture.lock() = Some(capture);

    set_recording(&state.recording, true);
    let recording = state.recording.clone();
    let app_for_thread = app.clone();
    let state_for_thread = state.clone();

    std::thread::spawn(move || {
        let mut resampler = match Resampler16k::new(src_sr) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("resampler: {e}");
                return;
            }
        };
        let mut scratch = Vec::with_capacity(8192);
        let mut resampled = Vec::with_capacity(TARGET_SR);
        let mut last_interim = Instant::now();

        while is_recording(&recording) {
            let n = audio::drain_into(&mut cons, &mut scratch);
            if n == 0 {
                std::thread::sleep(Duration::from_millis(5));
                continue;
            }
            resampled.clear();
            if resampler.push(&scratch, &mut resampled).is_err() {
                continue;
            }
            for txt in engine.feed(&resampled) {
                let _ = app_for_thread.emit("transcript", TranscriptEvent { text: txt, interim: false });
            }
            if last_interim.elapsed() >= Duration::from_millis(200) {
                let it = engine.interim();
                if !it.is_empty() {
                    let _ = app_for_thread.emit("transcript", TranscriptEvent { text: it, interim: true });
                }
                last_interim = Instant::now();
            }
        }

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
            if let Err(e) = result {
                eprintln!("inject error: {e}");
            }
            let _ = app_for_thread.emit("transcript", TranscriptEvent { text: final_text, interim: false });
        }
        let _ = app_for_thread.emit("state", "idle");
    });

    let _ = app.emit("state", "recording");
    Ok(())
}

fn stop_session(state: &Arc<AppState>) {
    set_recording(&state.recording, false);
    *state.capture.lock() = None;
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Vowen", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let stop = MenuItem::with_id(app, "stop", "Stop Recording", true, None::<&str>)?;
    let copy_last = MenuItem::with_id(app, "copy_last", "Copy Last Transcription", true, None::<&str>)?;
    let transcribe_file = MenuItem::with_id(app, "transcribe_file", "Transcribe File", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Vowen", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&open, &sep1, &stop, &copy_last, &transcribe_file, &sep2, &settings, &sep3, &quit],
    )?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Vowen")
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
                    stop_session(&state);
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
    // Atajo fallback (combo con tecla no-modificadora): Ctrl+Shift+Space.
    let fallback_ptt = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &fallback_ptt {
                        match event.state() {
                            ShortcutState::Pressed => {
                                let _ = app.emit("ptt", "start");
                            }
                            ShortcutState::Released => {
                                let _ = app.emit("ptt", "stop");
                            }
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            list_models,
            set_inject_mode,
            download_model
        ])
        .setup(move |app| {
            // Catálogo de modelos (resource o embebido).
            let catalog_path = app
                .path()
                .resolve("models.json", tauri::path::BaseDirectory::Resource)
                .ok();
            let catalog = Catalog::load(catalog_path.as_deref()).expect("load catalog");

            let state = Arc::new(AppState {
                catalog,
                recording: flag(false),
                capture: Mutex::new(None),
                primary_id: Mutex::new("parakeet-tdt-0.6b-v2-int8".into()),
                fallback_id: Mutex::new(Some("whisper-base.en".into())),
                vad_id: Mutex::new("silero-vad".into()),
                provider: Mutex::new(provider_default()),
                inject_mode: Mutex::new(InjectMode::Paste),
            });
            app.manage(state.clone());

            // Bandeja del sistema.
            build_tray(app.handle())?;

            // Hotkey de bajo nivel (hold Ctrl+Shift) → evento "ptt".
            hotkey::spawn_ptt_listener(app.handle().clone());

            // Registrar el atajo fallback Ctrl+Shift+Space.
            let _ = app.global_shortcut().register(fallback_ptt);

            // Un único oyente de "ptt" controla las sesiones (vale para ambos caminos).
            let app_handle = app.handle().clone();
            let state_for_listener = state.clone();
            app.listen("ptt", move |event| {
                let payload = event.payload().trim_matches('"');
                match payload {
                    "start" => {
                        if let Err(e) = start_session(&app_handle, &state_for_listener) {
                            eprintln!("start: {e}");
                        }
                    }
                    "stop" => stop_session(&state_for_listener),
                    _ => {}
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
