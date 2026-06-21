---
name: build-tauri-locally
description: Build, launch, and troubleshoot this repo's Windows Tauri desktop app locally on the user's PC. Use when the user asks to build, package, locate, time, troubleshoot, or verify local Windows release artifacts for Yawning Face STT, or when the app shows localhost refused / white screen because a raw debug Tauri exe was launched without Vite. Covers exact dependencies such as Rust MSVC, Visual Studio C++ Build Tools, CMake, Node/npm, WiX/NSIS, output installer paths, dev-server launch, and when to prefer local builds over GitHub Actions.
---

# Build Tauri Locally

## Overview

Build the Windows release installer on this PC. Use local builds for quick testing, emergency packaging, or when GitHub Actions is slow. GitHub Actions is now the preferred distribution path because the `v0.1.3` Windows release completed successfully and published downloadable assets.

## Known Working Environment

Observed on this machine:

- OS: Windows 11
- Shell: PowerShell
- Node: `v24.17.0`
- npm: `11.13.0`
- Node path: `_vowen_analysis\tools\node-v24.17.0-win-x64`
- Rust toolchain: `stable-x86_64-pc-windows-msvc`
- rustc: `1.96.0`
- cargo: `1.96.0`
- Visual Studio Build Tools: `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools`
- Visual Studio version: `17.14.35 (June 2026)`
- Required VS workload/components: Desktop development with C++, MSVC x64/x86 build tools, Windows SDK
- CMake: `4.3.3`
- CMake path: `C:\Program Files\CMake\bin`
- Git: `2.54.0.windows.1`
- Runtime dependency for installed app: Microsoft Edge WebView2 Runtime, normally present on Windows 11

Tauri downloads or uses cached bundling tools during packaging:

- WiX Toolset for `.msi`
- NSIS for `setup.exe`

The first build may be slower or require network access while those tools are fetched.

## Timing Expectations

Observed local build on 2026-06-20:

- Total `npm run tauri build`: about `3m 57s`
- Rust release compile inside that build: about `3m 36s`
- Output size:
  - NSIS setup `.exe`: about `7 MB`
  - MSI: about `10 MB`

Observed GitHub Actions release build:

- `v0.1.3` total workflow time: about `23m 42s`
- `v0.1.3` Tauri build/upload step: about `18m 20s`

Expected future timing:

- Warm local build with no major Rust dependency changes: often under `1-2 min`
- Local build after Rust/dependency changes or clean target: about `3-6 min`
- GitHub hosted Windows build: usually `20-30 min` for this project, depending on cache and runner speed

## Preflight

Always start by checking repo state:

```powershell
git status --short --branch
```

Do not release from a dirty worktree unless the user explicitly wants those changes included.

Stop the running dev app and repo-local build helpers before a release build:

```powershell
$repo = "C:\Users\Usuario\Documents\GitHub\STT"
Get-Process -Name vowen-clone -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$procs = Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -in @("cargo.exe", "node.exe")) -and ($_.CommandLine -like "*$repo*" -or $_.ExecutablePath -like "*$repo*")
}
foreach ($proc in $procs) {
  try { Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop } catch {}
}
```

## Required PATH

The default shell may not know `rustc`, `cargo`, or `cmake`. Use this PATH before build commands:

```powershell
$repo = "C:\Users\Usuario\Documents\GitHub\STT"
$node = Join-Path $repo "_vowen_analysis\tools\node-v24.17.0-win-x64"
$env:Path = "$node;$env:USERPROFILE\.cargo\bin;C:\Program Files\CMake\bin;$env:Path"
Set-Location $repo
```

Verify versions:

```powershell
node --version
npm --version
rustc --version
cargo --version
rustup show active-toolchain
cmake --version
git --version
```

## Build Commands

If `node_modules` is missing or dependencies changed:

```powershell
npm ci
```

Normal local release build:

```powershell
npm run tauri build
```

Optional faster validation before packaging:

```powershell
npm run build
Set-Location src-tauri
cargo check
Set-Location ..
```

## Local Launch Modes

Do not confuse the raw debug exe with a bundled production app.

Raw debug executable:

```text
src-tauri\target\debug\vowen-clone.exe
```

This exe expects the Tauri dev URL to be alive:

```text
http://localhost:1420
```

If you launch the raw debug exe without Vite running, the app window shows a browser-style error such as:

```text
localhost refused the connection
ERR_CONNECTION_REFUSED
```

That is not a frontend build failure. It means the debug WebView has no dev server to load.

For quick interactive testing of the debug exe:

```powershell
$repo = "C:\Users\Usuario\Documents\GitHub\STT"
$node = Join-Path $repo "_vowen_analysis\tools\node-v24.17.0-win-x64"
$env:Path = "$node;$env:Path"
Set-Location $repo
Start-Process powershell.exe -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "Set-Location '$repo'; `$env:Path='$node;' + `$env:Path; npm run dev -- --host 127.0.0.1 --port 1420"
) -WindowStyle Hidden

for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 250
  if (Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue) { break }
}

Get-Process -Name vowen-clone -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Process "$repo\src-tauri\target\debug\vowen-clone.exe" -WorkingDirectory "$repo\src-tauri\target\debug"
```

For non-localhost testing, use a bundled/release build instead:

```powershell
npm run tauri build
Start-Process ".\src-tauri\target\release\vowen-clone.exe"
```

Or install/run the generated setup exe:

```text
src-tauri\target\release\bundle\nsis\Yawning Face STT_<version>_x64-setup.exe
```

Rule of thumb:

- `npm run tauri dev` or raw debug exe = needs Vite/localhost.
- `npm run tauri build` release exe or installer = no localhost.
- If the user says "localhost refused" after an agent launched the app, first start Vite on `1420` or relaunch a bundled release build. Do not keep relaunching `target\debug\vowen-clone.exe` by itself.

## Output Artifacts

Preferred installer for users:

```text
src-tauri\target\release\bundle\nsis\Yawning Face STT_<version>_x64-setup.exe
```

Alternative MSI:

```text
src-tauri\target\release\bundle\msi\Yawning Face STT_<version>_x64_en-US.msi
```

Built app executable:

```text
src-tauri\target\release\vowen-clone.exe
```

Open the output folder for the current configured version:

```powershell
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
$installer = "src-tauri\target\release\bundle\nsis\Yawning Face STT_${version}_x64-setup.exe"
Start-Process explorer.exe -ArgumentList "/select,`"$PWD\$installer`""
```

Generate checksums:

```powershell
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
Get-FileHash "src-tauri\target\release\bundle\nsis\Yawning Face STT_${version}_x64-setup.exe" -Algorithm SHA256
Get-FileHash "src-tauri\target\release\bundle\msi\Yawning Face STT_${version}_x64_en-US.msi" -Algorithm SHA256
```

## GitHub Release Artifacts

GitHub release asset names use dots in the product name:

```text
Yawning.Face.STT_<version>_x64-setup.exe
Yawning.Face.STT_<version>_x64_en-US.msi
```

Example verified asset:

```text
https://github.com/EHxuban11/STT/releases/download/v0.1.3/Yawning.Face.STT_0.1.3_x64-setup.exe
```

If the repo is private, use `gh release download` or a logged-in browser session.

## Troubleshooting

- `rustc` / `cargo` not recognized: prepend `$env:USERPROFILE\.cargo\bin`.
- `cmake` not recognized: prepend `C:\Program Files\CMake\bin`.
- MSVC/linker errors: install or repair Visual Studio 2022 Build Tools with Desktop development with C++, MSVC x64/x86 tools, and Windows SDK.
- Target or linker file locked: stop `vowen-clone`, `cargo.exe`, and repo-local `node.exe` processes, then retry.
- Packaging downloads fail: retry with network access; Tauri may need WiX/NSIS on first package build.
- SmartScreen warning on install: expected for unsigned Windows builds. This is code signing, not a build failure.
- Installed app has no model yet: speech models are downloaded separately at runtime; they are not bundled into the installer.
- Local build prints dead-code warnings: warnings about `ResolvedModel` or `fallback` are harmless unless the final command exits nonzero.
