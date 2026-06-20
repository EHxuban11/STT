# Yawning Face STT — Prioritized Improvement Plan

Consolidated, de-duplicated plan from the 4-dimension review (Rust backend, dead UI controls, dictation UX, React/TS frontend). Only `verdict=real` items (plus clearly-worth-it risky ones) are kept. The two `wrong` findings (audio-level VU already wired; WindowControls capabilities already granted) and the not-worth-it risky items (listener-cleanup race, useTopBar footgun, resampler flush padding) are excluded or folded in as notes.

Priorities reflect impact × effort, not the per-finding numbers in the source reports.

---

## P1 — Do now (high impact, small/medium effort)

### 1. Atomic recording claim (foundation for all session-race fixes)
**Why it matters:** `is_recording` is checked (lib.rs:146) and set (lib.rs:168) non-atomically over an `AtomicBool`. Both the rdevin hotkey and the global-shortcut fallback emit `'ptt'` start, so two starts can pass the guard and spawn duplicate capture/worker sessions. This single fix underpins the engine-cache race and the stop/restore race.
**Files:** `src-tauri/src/audio.rs`, `src-tauri/src/lib.rs`
**Implementation:** Add `pub fn try_claim_recording(f: &RecordingFlag) -> bool { f.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire).is_ok() }` in audio.rs. In `start_session` replace the `is_recording` early-return with `if !try_claim_recording(&state.recording) { return Ok(()); }` and DELETE the later `set_recording(true)` at line 168. On any early error path after claiming (e.g. `start_capture` fails at line 164) call `set_recording(false)` before returning so the flag never sticks. Have the worker clear the flag as its LAST step, after restoring the engine (`*state2.engine.lock() = engine` at ~line 224), so a new start cannot re-claim mid-finish. This also subsumes most of the stop/restore and engine-clobber hazards.

### 2. Wire speech-model download to real catalog ids (downloads currently always fail)
**Why it matters:** The UI builds ids like `en:Parakeet V2` (SpeechModels.tsx:41), but the backend catalog (`src-tauri/models.json`) uses slug ids (`parakeet-tdt-0.6b-v2-int8`, etc.). Every `download_model` invoke throws `unknown model id` and is swallowed by a `console.error` in models.ts:19 — the spinner silently disappears. Whisper Medium/Small/Large/Turbo rows have no catalog entry at all.
**Files:** `src/lib/data.ts`, `src/pages/SpeechModels.tsx`, `src/lib/models.ts`
**Implementation:** Add `backendId?: string` to `LocalModel` in data.ts, set it only for the 4 rows with a real catalog entry (Parakeet V2 → `parakeet-tdt-0.6b-v2-int8`, V3 → `parakeet-tdt-0.6b-v3-int8`, Base → `whisper-base.en`, Tiny → `whisper-tiny.en`). In SpeechModels.tsx call `downloadModel(m.backendId, ...)` only when `backendId` is set; render rows without a `backendId` disabled/hidden. Keep the display id (`${group}:${m.name}`) for store/installed state to avoid touching persisted localStorage keys. Surface download failures to the user (toast) instead of console.error-only. Defer the larger "drive UI from `list_models()`" refactor.

### 3. Reconcile frontend `installed` state with real backend readiness
**Why it matters:** The store hardcodes `installed: ['en:Parakeet V2']` (store.tsx:52) in a namespace disjoint from catalog ids, so a fresh install claims readiness it does not have and a successful download never marks the displayed model installed. This is the root cause behind the no-model dead-ends and missing onboarding.
**Files:** `src-tauri/src/lib.rs`, `src-tauri/src/models.rs`, `src/lib/store.tsx`, `src/lib/models.ts`
**Implementation:** Add a `list_installed_models` Tauri command that maps over `state.catalog.models` and returns each entry's id plus `installed: bool` via `models::resolve(root, entry)` (which checks `.exists()`). Register it, call it on app start, and hydrate the store keyed off catalog ids (unify the store to catalog ids or add an explicit mapping). Land this before onboarding (item 11) since onboarding must gate on ground-truth readiness.

### 4. Wire Text-Insertion-Method dropdown to `set_inject_mode`
**Why it matters:** Settings.tsx:153 is a static `<Dropdown value="Paste method" />` with no binding, so the backend is permanently in Paste mode even though the full path exists (`InjectMode` enum, `set_inject_mode` command registered, `start_session` branches on it).
**Files:** `src/pages/Settings.tsx`, `src/lib/store.tsx`, (verify/extend `Dropdown` component)
**Implementation:** The `Dropdown` component is currently display-only — extend it to accept `value`+`options`+`onChange` or swap in a native `<select>`. Add `injectMode: "paste"|"type"` to `AppState.general` (default `"paste"`), bind the control, and on change `invoke("set_inject_mode", { mode })` passing lowercase `"paste"`/`"type"` to match the serde rename. Push the persisted value once on startup so the backend matches the saved preference after relaunch.

### 5. No-model hotkey press gives a clear signal (kill the silent dead-end)
**Why it matters:** With no model downloaded, `start_session` still captures audio and shows the pill with a live meter and "Listening…" (only an `eprintln` at lib.rs:156). Nothing transcribes, nothing injects, no error — it looks like it worked. High-confidence-killing UX bug.
**Files:** `src-tauri/src/lib.rs`, `src/pages/Pill.tsx`, `src/lib/dictation.tsx`
**Implementation:** In `start_session`, when `build_engine` returns `None`, do NOT start capture; instead emit a distinct event (e.g. `app.emit("state", "no-model")` or `app.emit("error", "No speech model downloaded")`) on the main thread before spawning the worker. Add a branch in Pill.tsx's state listener and dictation.tsx to render an amber dot + "No speech model installed" with no meter / a toast. Defer the clickable-pill-to-settings navigation.

### 6. Fix the misleading Windows hotkey hint
**Why it matters:** Home.tsx:141 advertises "Hold Ctrl + ⇧", but the rdevin in-process hook dies once the WebView gains focus (tauri#14770, documented at hotkey.rs:15-17). The only reliable registered chord is `Ctrl+Shift+Space`.
**Files:** `src/pages/Home.tsx` (and `RecordingPill.tsx:75` if kept)
**Implementation:** Change the copy to "Hold Ctrl + Shift + Space". Do NOT touch backend trigger wiring. Consider platform-conditional copy if macOS is a target (bare-modifier hook may still work there). The sidecar-process fix is the correct long-term solution but is large — track separately.

### 7. Pill spectrogram: stop 60fps `setState` on the always-on-top window
**Why it matters:** Pill.tsx:51-68 calls `setHeights` every rAF frame with a freshly allocated array, so React re-renders and re-applies 15 inline styles ~60fps forever while the pill is visible — constant CPU/GPU on a transparent overlay.
**Files:** `src/pages/Pill.tsx`
**Implementation:** Keep a ref array of the 15 `<span>` nodes and mutate `node.style.height` directly inside the rAF tick, removing React state from the per-frame path. Only run the loop while audio is active: when `lvl < epsilon` and all bars are within epsilon of rest (0.1), `cancelAnimationFrame` and restart from the `audio-level` / `state==recording` handler. Combine with removing `transition-[height] duration-75` from the bar className (item 18).

---

## P2 — Soon (real gaps, moderate impact or slightly larger effort)

### 8. Atomic model download with `.part` rename + concurrency guard
**Why it matters:** Downloads write directly to the final path (models.rs:99,115); a killed download leaves a truncated file that `resolve()`'s `.exists()` check (models.rs:76-79) treats as present, so the next launch loads a corrupt ONNX. No per-id guard means overlapping downloads interleave bytes.
**Files:** `src-tauri/src/models.rs`, `src-tauri/src/lib.rs`
**Implementation:** Write the stream to `let part = tmp.with_extension("part")`, run the sha256 check (when present) against `part`, then `std::fs::rename(&part, &tmp)` (or extract from `part` for archives). On any early return/error `std::fs::remove_file(&part).ok()`. Add `downloading: Mutex<HashSet<String>>` to `AppState`; insert id at the top of `download_model` (return early/Err if present), remove on completion via a drop guard.

### 9. Surface worker-thread errors to the user
**Why it matters:** `Resampler16k::new` failure is swallowed with `.ok()` (lib.rs:178) — the session records but silently never transcribes. No-model is only `eprintln`; inject `Err` is only `eprintln` (lib.rs:233).
**Files:** `src-tauri/src/lib.rs`
**Implementation:** Emit a user-visible `"error"` event for: no model downloaded ("No speech model downloaded", on the main thread before the engine is moved into the worker), resampler init failure ("Audio resampler init failed (unsupported sample rate)"), and inject `Err(e)` (include the message). Frontend shows a toast. Keep `eprintln` for logs.

### 10. Wire "Copy Last Transcription" tray item (currently a no-op)
**Why it matters:** lib.rs:282 emits `tray-action`/`copy_last` but no frontend listener handles it — the menu item does nothing.
**Files:** `src-tauri/src/lib.rs`
**Implementation:** Handle it on the Rust side (works even when no window is shown): add `last_transcript: Mutex<String>` to `AppState`, set it where the final transcript is emitted (~lib.rs:235), and in the `copy_last` tray handler write it via the already-initialized `tauri_plugin_clipboard_manager` (`app.clipboard().write_text(...)`).

### 11. First-run onboarding / model download
**Why it matters:** No onboarding exists; a fresh install claims readiness it lacks. Users have no guided path to a working first transcription.
**Files:** new first-run route/modal, `src/lib/store.tsx`, `src/lib/models.ts`
**Implementation:** Sequence AFTER item 3. Add a first-run route/modal gated on a persisted `firstRunComplete` flag that calls `download_model` using the existing model-progress events. Make it dismissible ("skip for now") and ensure download failure does not hard-block the app.

### 12. Push selected speech model to backend (engine ignores selection)
**Why it matters:** SpeechModels.tsx:45 only updates the store; `primary_id` is hardcoded to v2 Parakeet (lib.rs:347) with no setter command, so the engine always loads v2 regardless of selection.
**Files:** `src-tauri/src/lib.rs`, `src/pages/SpeechModels.tsx`
**Implementation:** Add a `set_active_model(id)` command that sets `*state.primary_id.lock() = id` AND invalidates the cached engine (`*state.engine.lock() = None`) so `build_engine` re-runs (optionally re-prewarm on a background thread). Call `invoke("set_active_model", { id: backendId })` on selection. DEPENDS on item 2's backendId mapping — must pass a real catalog id or `resolve_id` returns None.

### 13. Start/stop audio cue (soundEffects default-true but no playback)
**Why it matters:** `soundEffects` defaults true and Settings advertises audio feedback, but there is zero playback anywhere. Users lack confirmation recording started.
**Files:** `src/lib/dictation.tsx`
**Implementation:** Frontend-only. In dictation.tsx's `state` handler, play a short start chime on `recording`, a success chime on final transcript, and an error tone for the no-model case (item 5), gated on `getState().general.soundEffects`, using a preloaded `HTMLAudioElement` from a bundled asset. No Rust audio dependency. Play from the main window, not Pill.tsx.

### 14. Auto-paste toggle has no backend gate
**Why it matters:** Settings.tsx:152 writes only to localStorage; `start_session` injects unconditionally (lib.rs:226-236). Users who turn auto-paste OFF still get injection.
**Files:** `src-tauri/src/lib.rs`, `src/pages/Settings.tsx`
**Implementation:** Add `auto_paste: Mutex<bool>` (default true) to `AppState` + a `set_auto_paste(enabled)` command (register it). Wrap the inject block so it only injects when the flag is true, but still emit the transcript event regardless so history saving works. Wire `onChange` → `invoke("set_auto_paste", { enabled })` + startup push.

### 15. Add accessible names to icon-only buttons
**Why it matters:** WindowControls buttons and Home's Copy button are icon + `title` only; `title` is not reliably announced, so screen readers say just "button". The Account button has no `onClick` (inert).
**Files:** `src/components/WindowControls.tsx`, `src/pages/Home.tsx`
**Implementation:** Add `aria-label` to each icon-only button (Minimize/Maximize/Close window, Toggle theme, Account, Copy transcription). For the handler-less Account button, remove it or mark `disabled`/`aria-disabled` until wired.

### 16. Persistence: skip ephemeral writes + handle QuotaExceeded
**Why it matters:** `emit()` (store.tsx:75-84) re-stringifies and writes ALL persisted state on every `setState`, including frequent ephemeral `{recording, liveText}` updates from dictation, and silently swallows `QuotaExceededError` — dropping persistence entirely. 200 long transcripts can approach the ~5MB quota.
**Files:** `src/lib/store.tsx`
**Implementation:** Split into `notifyListeners()` (always) and `persist()` (only when a non-`EPHEMERAL` key actually changed) — pass a flag from `setState`. On `QuotaExceededError`, trim oldest transcriptions and retry once; optionally cap per-entry length. (Items 16's two source findings merged.)

### 17. Deep-merge persisted `general` on load (forward-compat)
**Why it matters:** `load()` shallow-merges (`{ ...DEFAULT, ...JSON.parse(raw) }`, store.tsx:65), so an older persisted `general` fully replaces `DEFAULT.general` and any newly added setting key is `undefined` for existing users — the next added toggle silently renders unchecked.
**Files:** `src/lib/store.tsx`
**Implementation:** Deep-merge known nested objects inside the `try`: `general: { ...DEFAULT.general, ...(parsed.general ?? {}) }` (and similarly for any other nested record). Cheap insurance.

---

## P3 — Nice-to-have (polish, lower impact, or larger/riskier)

### 18. Remove redundant `transition-[height] duration-75` on pill bars
Pill.tsx:86 — the 75ms CSS tween restarts every ~16ms rAF frame and never completes, double-animating. Remove the class and rely on JS smoothing. Best landed with item 7.

### 19. Audio-level meter: noise floor + perceptual curve
Pill.tsx:54,59 — fixed `* 7` gain plus idle `0.45 * Math.random()` makes silence wiggle and loud input pin. Apply a noise floor (`Math.max(0, rms - 0.005)`), `Math.sqrt` curve instead of `* 7`, and scale the random term by `lvl` so silence reads flat. Frontend-only.

### 20. Stop emitting `feed()` results as interim transcript events (de-dup)
A finalized phrase can surface up to three times (feed-return mislabeled interim at lib.rs:197, `interim()` preview, and the cleaned final at lib.rs:235). Delete the `for txt in eng.feed(...) { emit interim:true }` loop at lib.rs:196-198 but keep `let _ = eng.feed(&resampled);` for accumulation side effects. Use `interim()` only for preview; keep lib.rs:235 as the sole `interim:false` emit.

### 21. Bound `interim_buf` re-transcription window
`interim()` re-decodes the entire growing buffer (~128k samples at max 8s) every ~250ms → O(n²) latency. Decode only the tail: `let start = n.saturating_sub(SAMPLE_RATE as usize * 3); transcribe(&self.recognizer, &self.interim_buf[start..])`. A 3s tail keeps the preview useful. (stt.rs:158)

### 22. Wire Auto-Enter toggle
Dead today (Settings.tsx:154). Add `auto_enter: Mutex<bool>` + `set_auto_enter` command; add `press_enter()` in inject.rs (`Enigo::key(Key::Return, Click)`) and call it after a successful inject when enabled. Wire toggle + startup push.

### 23. Wire Restore-Clipboard toggle
inject.rs:47-49 always restores; the toggle has no consumer. Add `restore_clipboard: Mutex<bool>` (default true) + setter; gate the restore on it. Also document that only text is preserved (non-text clipboard is destroyed). (Clipboard restore is otherwise best-effort — do not over-engineer confirmation polling.)

### 24. Wire Remove-Filler-Words toggle (split clean_text)
`clean_text` runs unconditionally and does BOTH filler stripping AND punctuation/capitalization (stt.rs:75-100). Split into `strip_fillers` + `normalize`; add `remove_fillers: Mutex<bool>` + setter; call `strip_fillers` only when enabled, always `normalize`. (lib.rs:219)

### 25. Engine-cache re-check-under-guard (pre-warm clobber)
Pre-warm (lib.rs:362-364) does `is_none()` then build+assign with the lock released between, so it can clobber the worker's restored engine. Build into a local `e`, then `let mut g = state_pw.engine.lock(); if g.is_none() { *g = Some(e); }`. With item 1's atomic claim, this removes the duplicate-build/clobber without a full state-machine enum (the enum is the cleaner long-term fix, deferred).

### 26. Tray icon: don't `unwrap()` the default window icon
lib.rs:266 `app.default_window_icon().unwrap()` panics startup if no icon is configured. Build conditionally: `let mut builder = TrayIconBuilder::with_id("main-tray"); if let Some(icon) = app.default_window_icon() { builder = builder.icon(icon.clone()); }`. Low real-world likelihood but a gratuitous foot-gun.

### 27. clipboard / navigator.clipboard error handling
Home.tsx:93 discards the `writeText` promise (unhandled rejection on permission/focus failure); dictation.tsx:33-37 try/catch can't catch the unawaited promise. Make handlers `async` and `await` with a catch. In Tauri prefer `@tauri-apps/plugin-clipboard-manager` (already permitted). Optional "Copied" toast.

### 28. Fix misleading Home stats labels
Home.tsx:131-134 — "+X this week" actually shows today's words / all-time counts; "Longest Streak" hardcodes 1 day. Relabel to match the real data ("today", "all time") or compute real weekly windows / distinct-active-days. Relabeling is the safe move.

### 29. Pill positioning: center via `outer_size()` and stop pinning to primary monitor
lib.rs:394-401 always centers on `primary_monitor()`, so the pill lands on the wrong screen in multi-monitor setups, and computes width from a logical-to-physical scale instead of querying real size. Switch to `pill.outer_size()`-based centering inside `show_pill` (re-center per session). "Monitor under the cursor" needs cursor+monitor enumeration — defer as a follow-up. (HiDPI off-center is largely theoretical; multi-monitor is the real half.)

### 30. Deterministic `idle` on tray Stop
`stop_session` emits no `"idle"`; normally the capture thread does, but an edge case (no thread yet observing the flag) leaves the UI un-cleared. Add `let _ = app.emit("state", "idle");` at the end of `stop_session`. dictation.tsx handles idle idempotently, so the eventual double-emit is harmless — verify no flicker.

### 31. Wire/use the fallback recognizer (or remove it)
`Engine.fallback` (stt.rs:106) is built but never read; `fallback_id` is hardcoded `None` (lib.rs:349) so nothing actually loads today (latent, not active). Either use it (retry on empty: `if text.trim().is_empty() { if let Some(fb)=&self.fallback { text = transcribe(fb, seg.samples()) } }`) or delete the field and its build. Do not leave it half-wired.

### 32. Open-at-Login / Start-Minimized OS integration
Store-only today (Settings.tsx:150-151). Add `tauri-plugin-autostart` (Cargo + init + capability) for open-at-login; read the persisted start-minimized flag at startup and hide the main window when set. New dependencies/capabilities → lowest priority.

### 33. Sound Effects, Clipboard-restore comments, pill contrast polish
- Pill desktop contrast (item from UX review): make the desktop pill opaque (`bg-zinc-900`) with a ring/border and re-enable shadow (`shadow(true)` at lib.rs:389) so it has edge definition over light wallpapers. Do NOT delete `RecordingPill.tsx` — it is the browser-demo path mounted via `RecordingOverlay` when `!isTauri`.
- Dead/placeholder UI cleanup: change `href="#"` anchors (Settings.tsx:120-121) to `<button>`, mark coming-soon buttons `disabled`, wire or remove the non-filtering Search input. Opportunistic.

---

## Excluded (verified not actionable)
- **Audio-level VU meter "dead in Tauri"** — `wrong`. Already wired in Pill.tsx:29 + rAF render loop. No action.
- **WindowControls maximize/close "broken in packaged app"** — `wrong`. `capabilities/default.json` already grants the window permissions for both `main` and `pill`. Only residual: wrap `win()` awaits in try/catch (folded into item 27's spirit).
- **Async listener-cleanup race** / **useTopBar exhaustive-deps footgun** / **Pill+dictation dual-subscribe** — risky/theoretical, no confirmed bug. Document only.
- **Resampler16k::flush zero-padding** — risky; ~64ms trailing silence is by-design and harmless for dictation. Just add a clarifying comment at audio.rs:92.
