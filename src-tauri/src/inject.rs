use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::{thread, time::Duration};
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

fn make_enigo() -> Result<Enigo, String> {
    let settings = Settings {
        open_prompt_to_get_permissions: true,
        independent_of_keyboard_state: true,
        ..Default::default()
    };
    Enigo::new(&settings).map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
pub fn ensure_accessibility() -> bool {
    macos_accessibility_client::accessibility::application_is_trusted_with_prompt()
}
#[cfg(not(target_os = "macos"))]
pub fn ensure_accessibility() -> bool {
    true
}

/// Método 1 (por defecto): pegar vía portapapeles — atómico, a prueba de layout/IME.
pub fn insert_via_paste(app: &AppHandle, text: &str) -> Result<(), String> {
    if !ensure_accessibility() {
        return Err("Accessibility/Input permission not granted".into());
    }
    let clip = app.clipboard();
    let previous = clip.read_text().ok();
    clip.write_text(text.to_string()).map_err(|e| e.to_string())?;

    let mut enigo = make_enigo()?;
    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;

    enigo.key(modifier, Direction::Press).map_err(|e| e.to_string())?;
    enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
    enigo.key(modifier, Direction::Release).map_err(|e| e.to_string())?;

    thread::sleep(Duration::from_millis(120));
    if let Some(prev) = previous {
        let _ = clip.write_text(prev);
    }
    Ok(())
}

/// Método 2 (fallback): tecleo Unicode directo. A prueba de emojis, independiente del layout.
pub fn insert_via_typing(text: &str) -> Result<(), String> {
    if !ensure_accessibility() {
        return Err("Accessibility/Input permission not granted".into());
    }
    let sanitized = text.replace('\0', "");
    let mut enigo = make_enigo()?;
    enigo.text(&sanitized).map_err(|e| e.to_string())
}
