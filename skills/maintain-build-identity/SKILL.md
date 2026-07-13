---
name: maintain-build-identity
description: Maintain and verify this repo's automatic visual distinction between orange Vite/Tauri development sessions and normally themed built or packaged Yawning Face STT artifacts. Use when changing app themes, build-mode detection, Vite or Tauri commands, developer colors or badges, recording-pill styling, or when development and release builds show the wrong visual identity.
---

# Maintain Build Identity

## Preserve the invariant

- Make `npm run dev` and `npm run tauri dev` unmistakably orange.
- Keep `npm run build`, `npm run preview`, `npm run tauri build`, installers, and GitHub releases on the normal product theme.
- Detect development at compile time with `import.meta.env.DEV`.
- Do not add a manual release flag, query parameter, local-storage preference, or user-facing toggle.
- Cover the main window, dark theme, onboarding and dialogs, and the `/#/pill` recording window.
- Keep the separate `website/` application out of scope.

## Inspect the identity path

Check these files before changing behavior:

- `src/lib/build.ts`
- `src/vite-env.d.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/pages/Pill.tsx`
- `src/components/RecordingPill.tsx`
- `vite.config.ts`
- `src-tauri/tauri.conf.json`

Keep build identity centralized in `src/lib/build.ts` and derive it exclusively from `import.meta.env.DEV`. Apply the root development class before React renders. Keep Vite environment typing enabled.

Do not infer development from `localhost`: the production preview also runs on localhost and must retain release styling.

## Maintain the visual treatment

- Scope development-only styles beneath the root development class.
- Keep development overrides strong enough to win over both light and dark theme variables.
- Make the orange treatment intentionally conspicuous, not a subtle brand-color adjustment.
- Keep a persistent `DEV BUILD` marker above onboarding, dialogs, and page content.
- Style the recording-pill surface explicitly because it uses hard-coded Zinc colors instead of the main theme variables.
- Preserve text contrast, controls, window dragging, and the pill window's transparent background.

Preserve Tauri's automatic command mapping:

- `beforeDevCommand` runs `npm run dev`.
- `beforeBuildCommand` runs `npm run build`.

Do not require callers or release workflows to remember an extra environment variable.

## Verify both outputs

Run:

```powershell
npm run build
```

Then verify the Vite development server:

- The document root has the development class.
- The main application is orange and displays `DEV BUILD`.
- Dark theme remains visibly orange.
- `/#/pill` has an orange development surface.

Serve the built `dist` output with `npm run preview` and verify:

- The development class is absent.
- No `DEV BUILD` marker appears.
- The main application and `/#/pill` use the normal product palette.

Run `npm run tauri build` only when Tauri build wiring changed or packaged-artifact verification is requested.

These checks do not require downloading, loading, or running a speech model.
