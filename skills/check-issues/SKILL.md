---
name: check-issues
description: Triage and act on this repo's GitHub Issues feedback pipeline for Yawning Face STT. Use when the user asks to check issues, inspect feedback, work through app feedback, close addressed issues, close noise, or decide what can be implemented from GitHub issues created by the in-app feedback widget.
---

# Check Issues

## Context

Yawning Face STT has an in-app feedback widget. User feedback is filed directly into GitHub Issues through `issue-creator`, usually with labels such as `feedback` and `app:yawningface-stt`.

Issue bodies often include useful app metadata:

- app route, for example `http://tauri.localhost/#/dictionary`
- app version
- platform
- user agent
- raw user feedback

Treat these issues as the product feedback inbox.

## Workflow

1. List open feedback issues:

```powershell
gh issue list --state open --limit 50 --json number,title,body,labels,author,createdAt,updatedAt,url
```

2. Triage each issue into one of these buckets:

- `real bug`: user reports broken behavior, confusing UX, missing expected behavior, or a reproducible failure.
- `real product task`: user asks for a reasonable feature or cleanup that matches the product direction.
- `already addressed`: current code or a recent release clearly fixes it.
- `noise/test`: obvious test text, accidental submission, duplicate nonsense, or pure praise with no action item.
- `needs clarification`: cannot be safely interpreted from the issue body or code.

3. For real bugs/tasks, inspect the relevant code and implement a focused fix when the user asked you to work on issues. Validate with the smallest useful local checks, usually:

```powershell
npm run build
Set-Location src-tauri
cargo check
Set-Location ..
```

4. Comment on issues you fix with the concrete commit/release context.

5. Close issues only when the reason is clear.

## Closing Rules

Close an issue as `completed` when:

- the requested behavior is implemented, verified, and committed; or
- the issue was positive feedback with no remaining action item.

Close an issue as `not planned` when:

- it is clearly a test/noise submission;
- it is duplicate nonsense; or
- it asks for something intentionally out of scope.

Do not close an issue just because it is annoying, vague, or not yet implemented. Leave real product work open.

Useful commands:

```powershell
gh issue close 12 --reason completed --comment "Implemented in <commit/tag>. Verified with npm run build and cargo check."
gh issue close 13 --reason "not planned" --comment "Closing this as a test/noise issue rather than product work."
gh issue comment 14 --body "Confirmed this is still real. Leaving open for the next pass."
```

## Reporting

When finished, report:

- issues closed, with reasons
- issues left open, with why
- commits pushed
- checks run
