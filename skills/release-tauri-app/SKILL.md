---
name: release-tauri-app
description: Release this repo's Tauri desktop app through GitHub Actions. Use when the user asks to prepare, version, tag, build, publish, verify, download, or troubleshoot a downloadable Windows release for Yawning Face STT, including GitHub Releases, installers, release workflow runs, version bumps, and canceled/failed release attempts.
---

# Release Tauri App

## Overview

Release the app by bumping the repo version, validating locally, pushing `main`, and pushing a `v*` tag. The workflow at `.github/workflows/release.yml` builds the Windows installer on GitHub Actions and publishes a non-draft GitHub Release.

## Current Release System

- Workflow: `.github/workflows/release.yml`
- Trigger: pushing a tag matching `v*`, or manual `workflow_dispatch`
- Platform: Windows only (`windows-latest`)
- Frontend runtime: Node `24`
- Rust: stable MSVC toolchain from `dtolnay/rust-toolchain`
- Build action: `tauri-apps/tauri-action@v0`
- Workflow permission required: `contents: write`
- Repository Actions setting required: default workflow permissions set to `write`
- Output: public, non-draft, non-prerelease GitHub Release with NSIS `.exe` and MSI assets

The repo may still be private. If it is private, direct release asset URLs return `404` for unauthenticated users even when the release exists. Use `gh release download` or open the link while logged into an account with repo access.

Known good automated release:

- Tag: `v0.1.3`
- Run: `27885343207`
- Result: success
- Release: `https://github.com/EHxuban11/STT/releases/tag/v0.1.3`
- Windows setup asset: `Yawning.Face.STT_0.1.3_x64-setup.exe`

## Release Workflow

1. Inspect state first:

```powershell
git status --short --branch
git pull --ff-only
git log -3 --oneline
```

Do not overwrite unrelated user changes. If the worktree is dirty, understand the changes before releasing.

2. Choose the release version.

Use SemVer-style versions such as `0.1.4`, `0.2.0`, or `1.0.0`. The matching Git tag must be `v0.1.4`, `v0.2.0`, etc.

3. Bump all project version fields together:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Keep these three in sync.

4. Run local validation:

```powershell
npm run build
Set-Location src-tauri
cargo check
Set-Location ..
```

For a stronger preflight when time allows, run:

```powershell
npm run tauri build
```

5. Commit the release bump:

```powershell
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "Release v0.1.4"
git push origin main
```

Adjust the version in the commit message.

6. Create and push the tag:

```powershell
git tag v0.1.4
git push origin v0.1.4
```

Pushing the tag starts the GitHub Actions release workflow.

7. Verify the workflow and release:

```powershell
gh run list --workflow release --limit 5
gh run watch --exit-status
gh release view v0.1.4 --json url,isDraft,isPrerelease,assets
```

Confirm:

- The latest tag run is `completed` with `conclusion: success`.
- The release is not draft.
- The release is not prerelease unless intentionally requested.
- A `*_x64-setup.exe` asset exists.
- A `*_x64_en-US.msi` asset exists.

8. Test an authenticated download:

```powershell
$tag = "v0.1.4"
$dir = Join-Path $env:TEMP "yf-release-test-$tag"
Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $dir | Out-Null
gh release download $tag --pattern "*setup.exe" --dir $dir
Get-ChildItem $dir
```

## Download URL Pattern

For tag `v0.1.3`, the direct setup URL is:

```text
https://github.com/EHxuban11/STT/releases/download/v0.1.3/Yawning.Face.STT_0.1.3_x64-setup.exe
```

For newer tags, replace both `v0.1.3` and `0.1.3`.

## Troubleshooting

- Canceled old runs: ignore obsolete tags if a newer run succeeded. `v0.1.1` and `v0.1.2` were intentionally superseded during workflow repair.
- `Resource not accessible by integration`: set workflow permissions to write in repository Actions settings and keep `permissions: contents: write` in the workflow.
- CMake missing: the workflow's `Verify CMake` step installs CMake with Chocolatey if GitHub's runner image does not already expose it.
- Node/npm failure: inspect `setup-node`, npm cache, and `npm ci`.
- Rust/Tauri failure: inspect the `Build and upload Tauri release` step logs first.
- Direct asset URL returns `404`: the repo is private or the viewer is not authenticated.
- Windows SmartScreen warning: expected for unsigned builds. This is code signing, not a build failure.
- macOS requests: keep out of the primary release path until Apple signing/notarization is configured.
