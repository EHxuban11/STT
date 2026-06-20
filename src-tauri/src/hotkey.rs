use rdevin::{listen, Event, EventType, Key};
use std::cell::RefCell;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

#[derive(Default)]
struct Mods {
    ctrl: bool,
    shift: bool,
}

/// Global keyboard hook. Emits "ptt" = "start" when Ctrl+Shift are held,
/// and "stop" when either modifier is released.
pub fn spawn_ptt_listener(app: AppHandle) {
    std::thread::spawn(move || {
        let state = RefCell::new(Mods::default());
        let active = AtomicBool::new(false);

        let cb = move |event: Event| {
            let mut m = state.borrow_mut();
            match event.event_type {
                EventType::KeyPress(k) => set(&mut m, k, true),
                EventType::KeyRelease(k) => set(&mut m, k, false),
                _ => return,
            }
            let both = m.ctrl && m.shift;
            if both && !active.swap(true, Ordering::SeqCst) {
                let _ = app.emit("ptt", "start");
            } else if !both && active.swap(false, Ordering::SeqCst) {
                let _ = app.emit("ptt", "stop");
            }
        };

        if let Err(e) = listen(cb) {
            eprintln!("rdevin listen error: {e:?}");
        }
    });
}

fn set(m: &mut Mods, k: Key, down: bool) {
    match k {
        Key::ControlLeft | Key::ControlRight => m.ctrl = down,
        Key::ShiftLeft | Key::ShiftRight => m.shift = down,
        _ => {}
    }
}
