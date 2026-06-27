#[cfg(not(target_os = "windows"))]
use rdevin::{listen, Event, EventType, Key};
use std::thread;
use std::time::{Duration, Instant};

#[cfg(not(target_os = "windows"))]
#[derive(Default)]
struct Mods {
    ctrl: bool,
    alt: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PttEvent {
    Start,
    Stop,
}

const ACTIVATION_DELAY: Duration = Duration::from_millis(140);

/// Global keyboard hook. Emits "ptt" = "start" when Ctrl+Win are held,
/// and "stop" when either modifier is released.
///
/// Se usa Ctrl+Win (no Ctrl+Shift) para no chocar con la selección de texto
/// (Ctrl+Shift+flechas/clic) en editores. Ctrl+Win no abre el menú Inicio
/// (eso solo ocurre al soltar Win en solitario), así que es seguro mantenerlo.
#[cfg(target_os = "windows")]
pub fn spawn_ptt_listener<F>(mut on_event: F)
where
    F: FnMut(PttEvent) + Send + 'static,
{
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_CONTROL, VK_LCONTROL, VK_LWIN, VK_RCONTROL, VK_RWIN,
    };

    fn down(vk: u16) -> bool {
        unsafe { (GetAsyncKeyState(vk as i32) as u16) & 0x8000 != 0 }
    }

    fn modifier(vk: u16) -> bool {
        matches!(vk, VK_CONTROL | VK_LCONTROL | VK_RCONTROL | VK_LWIN | VK_RWIN)
    }

    fn other_key_down() -> bool {
        (1u16..=254).any(|vk| !modifier(vk) && down(vk))
    }

    enum State {
        Idle,
        Pending(Instant),
        Active,
        Canceled,
    }

    thread::spawn(move || {
        let mut state = State::Idle;
        loop {
            let ctrl = down(VK_CONTROL) || down(VK_LCONTROL) || down(VK_RCONTROL);
            let win = down(VK_LWIN) || down(VK_RWIN);
            let both = ctrl && win;

            match (&state, both) {
                (State::Idle, true) => {
                    state = State::Pending(Instant::now());
                }
                (State::Pending(_), true) if other_key_down() => {
                    state = State::Canceled;
                }
                (State::Pending(since), true) if since.elapsed() >= ACTIVATION_DELAY => {
                    state = State::Active;
                    on_event(PttEvent::Start);
                }
                (State::Active, false) => {
                    state = State::Idle;
                    on_event(PttEvent::Stop);
                }
                (State::Pending(_), false) | (State::Canceled, false) => {
                    state = State::Idle;
                }
                _ => {}
            }

            thread::sleep(Duration::from_millis(10));
        }
    });
}

#[cfg(not(target_os = "windows"))]
pub fn spawn_ptt_listener<F>(mut on_event: F)
where
    F: FnMut(PttEvent) + Send + 'static,
{
    thread::spawn(move || {
        let mut state = Mods::default();
        let mut active = false;

        let cb = move |event: Event| {
            match event.event_type {
                EventType::KeyPress(k) => set(&mut state, k, true),
                EventType::KeyRelease(k) => set(&mut state, k, false),
                _ => return,
            }
            // En macOS: Ctrl + Option (Opt). Evita que Shift (mayúsculas) dispare el mic.
            let both = state.ctrl && state.alt;
            if both && !active {
                active = true;
                on_event(PttEvent::Start);
            } else if !both && active {
                active = false;
                on_event(PttEvent::Stop);
            }
        };

        if let Err(e) = listen(cb) {
            eprintln!("rdevin listen error: {e:?}");
        }
    });
}

#[cfg(not(target_os = "windows"))]
fn set(m: &mut Mods, k: Key, down: bool) {
    match k {
        Key::ControlLeft | Key::ControlRight => m.ctrl = down,
        // En macOS, Option izquierda = Alt y Option derecha = AltGr.
        Key::Alt | Key::AltGr => m.alt = down,
        _ => {}
    }
}
