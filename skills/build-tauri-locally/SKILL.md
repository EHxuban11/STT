---
name: build-tauri-locally
description: Build this repo's Windows Tauri desktop installer locally on the user's PC. Use when the user asks to build, package, locate, time, troubleshoot, or verify local Windows release artifacts for Yawning Face STT, including exact dependencies such as Rust MSVC, Visual Studio C++ Build Tools, CMake, Node/npm, WiX/NSIS, and output installer paths.
---

# Build Tauri Locally

## Overview

Build the Windows release installer on this PC instead of relying on GitHub Actions. This is currently faster and more reliable for early Yawning Face STT releases.

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
  - NSIS setup `.exe`: about `7.05 MB`
  - MSI: about `9.75 MB`

Expected future timing:

- Warm local build with no major Rust dependency changes: often under `1-2 min`
- Local build after Rust/dependency changes or clean target: about `3-6 min`
- GitHub hosted Windows build can take `15-20 min` on cold cache for this project

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

## Output Artifacts

Preferred installer for users:

```text
src-tauri\target\release\bundle\nsis\Yawning Face STT_0.1.0_x64-setup.exe
```

Alternative MSI:

```text
src-tauri\target\release\bundle\msi\Yawning Face STT_0.1.0_x64_en-US.msi
```

Built app executable:

```text
src-tauri\target\release\vowen-clone.exe
```

Open the output folder:

```powershell
Start-Process explorer.exe -ArgumentList "/select,`"$PWD\src-tauri\target\release\bundle\nsis\Yawning Face STT_0.1.0_x64-setup.exe`""
```

Generate checksums:

```powershell
Get-FileHash "src-tauri\target\release\bundle\nsis\Yawning Face STT_0.1.0_x64-setup.exe" -Algorithm SHA256
Get-FileHash "src-tauri\target\release\bundle\msi\Yawning Face STT_0.1.0_x64_en-US.msi" -Algorithm SHA256
```

## Troubleshooting

- `rustc` / `cargo` not recognized: prepend `$env:USERPROFILE\.cargo\bin`.
- `cmake` not recognized: prepend `C:\Program Files\CMake\bin`.
- MSVC/linker errors: install or repair Visual Studio 2022 Build Tools with Desktop development with C++, MSVC x64/x86 tools, and Windows SDK.
- Target or linker file locked: stop `vowen-clone`, `cargo.exe`, and repo-local `node.exe` processes, then retry.
- Packaging downloads fail: retry with network access; Tauri may need WiX/NSIS on first package build.
- SmartScreen warning on install: expected for unsigned Windows builds. This is code signing, not a build failure.
- Installed app has no model yet: speech models are downloaded separately at runtime; they are not bundled into the installer.
