#[cfg(not(target_os = "windows"))]
use rdevin::{listen, Event, EventType, Key};
use std::thread;
use std::time::{Duration, Instant};

#[cfg(not(target_os = "windows"))]
#[derive(Default)]
struct Mods {
    ctrl: bool,
    shift: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PttEvent {
    Start,
    Stop,
}

const ACTIVATION_DELAY: Duration = Duration::from_millis(140);

/// Global keyboard hook. Emits "ptt" = "start" when Ctrl+Shift are held,
/// and "stop" when either modifier is released.
#[cfg(target_os = "windows")]
pub fn spawn_ptt_listener<F>(mut on_event: F)
where
    F: FnMut(PttEvent) + Send + 'static,
{
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_CONTROL, VK_LCONTROL, VK_LSHIFT, VK_RCONTROL, VK_RSHIFT, VK_SHIFT,
    };

    fn down(vk: u16) -> bool {
        unsafe { (GetAsyncKeyState(vk as i32) as u16) & 0x8000 != 0 }
    }

    fn modifier(vk: u16) -> bool {
        matches!(vk, VK_CONTROL | VK_LCONTROL | VK_RCONTROL | VK_SHIFT | VK_LSHIFT | VK_RSHIFT)
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
            let shift = down(VK_SHIFT) || down(VK_LSHIFT) || down(VK_RSHIFT);
            let both = ctrl && shift;

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
            let both = state.ctrl && state.shift;
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
        Key::ShiftLeft | Key::ShiftRight => m.shift = down,
        _ => {}
    }
}
