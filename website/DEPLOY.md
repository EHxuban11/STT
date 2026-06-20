# Deploying Yawning Face STT to Vercel

This is a standard Next.js (App Router) app. It deploys to Vercel with zero extra configuration.

## Option A — Vercel CLI (fastest)

From inside the `website/` folder:

```bash
# 1. Install deps (first time only)
npm install

# 2. Preview deploy (creates a throwaway URL, runs a login flow the first time)
npx vercel

# 3. Production deploy
npx vercel --prod
```

The first `npx vercel` run will prompt you to log in (browser/email) and link the
project. Accept the detected defaults — Vercel auto-detects Next.js, the build
command (`next build`) and the output directory.

## Option B — Import the Git repo in the Vercel dashboard

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Go to https://vercel.com/new and import the repository.
3. **Important:** set the **Root Directory** to `website` (this app lives in a
   subfolder of the repo, not the repo root).
4. Framework preset: **Next.js** (auto-detected). Leave build/output settings at
   their defaults.
5. Click **Deploy**.

## Notes

- No environment variables are required for the landing page.
- Node.js 18.18+ / 20+ is recommended (Vercel uses a compatible runtime by default).
- Build command: `next build` &nbsp;|&nbsp; Install command: `npm install`.
