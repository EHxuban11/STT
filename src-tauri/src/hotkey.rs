#[cfg(not(target_os = "windows"))]
use rdevin::{listen, Event, EventType, Key};
use std::thread;
use std::time::Duration;

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

    thread::spawn(move || {
        let mut active = false;
        loop {
            let ctrl = down(VK_CONTROL) || down(VK_LCONTROL) || down(VK_RCONTROL);
            let shift = down(VK_SHIFT) || down(VK_LSHIFT) || down(VK_RSHIFT);
            let both = ctrl && shift;

            if both && !active {
                active = true;
                on_event(PttEvent::Start);
            } else if !both && active {
                active = false;
                on_event(PttEvent::Stop);
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
