---
name: release-tauri-app
description: Release this repo's Tauri desktop app through GitHub Actions. Use when the user asks to prepare, version, tag, build, publish, or troubleshoot a downloadable Windows/macOS release for Yawning Face STT, including draft GitHub Releases, installers, release workflow runs, and version bumps.
---

# Release Tauri App

## Overview

Release the Tauri app by bumping the repo version, validating locally, pushing `main`, and pushing a `v*` tag. The existing workflow at `.github/workflows/release.yml` builds installers and creates a draft GitHub Release.

## Current Release System

- Workflow: `.github/workflows/release.yml`
- Trigger: pushing a tag matching `v*`, or manual `workflow_dispatch`
- Output: draft GitHub Release with Tauri build assets
- Platforms currently configured: `windows-latest` and `macos-14`
- Windows builds can be distributed unsigned, but users may see SmartScreen warnings.
- macOS builds may compile on GitHub runners, but normal-user distribution eventually needs Apple Developer signing and notarization.

## Release Workflow

1. Inspect state first:

```powershell
git status --short --branch
git pull --ff-only
git log -3 --oneline
```

Do not overwrite unrelated user changes. If the worktree is dirty, understand the changes before releasing.

2. Choose the release version.

Use SemVer-style versions such as `0.1.1`, `0.2.0`, or `1.0.0`. The matching Git tag must be `v0.1.1`, `v0.2.0`, etc.

3. Bump all project version fields together:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Keep these three in sync.

4. Run local validation:

```powershell
npm run build
cd src-tauri
cargo check
cd ..
```

For a stronger preflight when time allows, run the full local Tauri build:

```powershell
npm run tauri build
```

5. Commit the release bump:

```powershell
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "Release v0.1.1"
git push origin main
```

Adjust the version in the commit message.

6. Create and push the tag:

```powershell
git tag v0.1.1
git push origin v0.1.1
```

Pushing the tag starts the GitHub Actions release workflow.

7. Verify the release workflow.

If `gh` is available:

```powershell
gh run list --workflow release --limit 5
gh run watch
gh release list --limit 5
```

Otherwise, check GitHub Actions and Releases in the browser or with the GitHub connector if available.

8. Publish only after inspection.

The workflow creates draft releases by design. Before publishing, confirm that the Windows installer asset exists and the release notes/version are correct.

## Windows-Only Releases

If the user wants a Windows-only release for now, either:

- leave the workflow as-is and ignore the macOS artifact if it succeeds, or
- edit `.github/workflows/release.yml` to remove/comment the `macos-14` matrix entry before tagging.

Prefer Windows-only when the user wants fast practical distribution and has not configured Apple signing secrets.

## Troubleshooting

- If GitHub Actions fails before Rust builds, inspect Node/npm setup and `npm ci`.
- If it fails during Rust/Tauri build, inspect CMake, Tauri config, and crate feature errors first.
- If Windows builds but users complain about scary install warnings, explain that this is code signing, not a build failure.
- If macOS builds fail because signing secrets are missing, either switch to Windows-only for now or configure Apple Developer signing/notarization later.
- If no release appears, confirm the tag starts with `v` and was pushed to `origin`.
