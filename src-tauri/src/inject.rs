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

/// Espera (con tope) a que los modificadores FÍSICOS estén realmente arriba.
///
/// El PTT es "mantener Ctrl+Shift": al soltar, la inyección se dispara al instante,
/// pero los "key-up" físicos de Ctrl/Shift pueden seguir en vuelo. Si el up de Ctrl
/// cae entre nuestro Ctrl↓ sintético y la V, Windows ve una "v" suelta (el bug).
/// Sondeamos GetAsyncKeyState hasta que todos los modificadores estén liberados.
#[cfg(target_os = "windows")]
fn wait_for_modifiers_released() {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
    };
    let keys = [VK_CONTROL, VK_SHIFT, VK_MENU, VK_LWIN, VK_RWIN];
    let any_down = || {
        keys.iter()
            .any(|&k| unsafe { (GetAsyncKeyState(k as i32) as u16) & 0x8000 != 0 })
    };
    // Hasta ~600 ms; en la práctica se resuelve en una o dos iteraciones.
    for _ in 0..60 {
        if !any_down() {
            break;
        }
        thread::sleep(Duration::from_millis(10));
    }
    // Margen extra para que los up físicos se propaguen antes del Ctrl+V sintético.
    thread::sleep(Duration::from_millis(25));
}

#[cfg(not(target_os = "windows"))]
fn wait_for_modifiers_released() {
    // Fallback sin acceso directo al estado de teclas: pequeño asentamiento.
    thread::sleep(Duration::from_millis(60));
}

/// Método 1 (por defecto): pegar vía portapapeles — atómico, a prueba de layout/IME.
pub fn insert_via_paste(app: &AppHandle, text: &str) -> Result<(), String> {
    if !ensure_accessibility() {
        return Err("Accessibility/Input permission not granted".into());
    }
    let clip = app.clipboard();
    let previous = clip.read_text().ok();
    clip.write_text(text.to_string())
        .map_err(|e| e.to_string())?;

    let mut enigo = make_enigo()?;

    // 1) Evitar la CARRERA con el hotkey: esperar a que Ctrl/Shift físicos suelten.
    wait_for_modifiers_released();

    // 2) Neutralizar cualquier modificador que el SO todavía crea pulsado, para que
    //    el Ctrl+V salga limpio aunque un up físico se haya perdido.
    for k in [Key::Control, Key::Shift, Key::Alt, Key::Meta] {
        let _ = enigo.key(k, Direction::Release);
    }

    // 3) Pegar. Usar la tecla virtual V (Key::Other), NO Key::Unicode('v'): en Windows
    //    Key::Unicode usa KEYEVENTF_UNICODE e IGNORA el modificador → escribiría una "v"
    //    literal. Key::Other(VK) sí respeta Ctrl/Cmd.
    #[cfg(target_os = "macos")]
    let (modifier, v_key) = (Key::Meta, Key::Other(9)); // Cmd + V (kVK_ANSI_V)
    #[cfg(not(target_os = "macos"))]
    let (modifier, v_key) = (Key::Control, Key::Other(0x56)); // Ctrl + V (VK_V)

    enigo
        .key(modifier, Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(v_key, Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(modifier, Direction::Release)
        .map_err(|e| e.to_string())?;

    // Mantener el texto en el portapapeles el tiempo suficiente para que la app lo pegue.
    thread::sleep(Duration::from_millis(150));
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
