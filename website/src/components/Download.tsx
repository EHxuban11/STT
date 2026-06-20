import { Download as DownloadIcon, Apple, Monitor } from "lucide-react";
import GitHubStarPill from "@/components/GitHubStarPill";

const RELEASES_URL = "https://github.com/yawningface/releases";

export default function Download() {
  return (
    <section id="download" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-card md:p-12">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-start gap-6">
          <span className="text-4xl leading-none" aria-hidden>
            🥱
          </span>
          <h2 className="max-w-2xl text-3xl font-medium tracking-tight text-card-foreground md:text-4xl">
            Stop typing what you could just say
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Download Yawning Face STT for your platform and start dictating in
            minutes. It&apos;s free, open source, and runs entirely on your machine.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
            >
              <Monitor className="h-4 w-4" aria-hidden />
              Download for Windows
            </a>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
            >
              <Apple className="h-4 w-4" aria-hidden />
              Download for macOS
            </a>
          </div>

          <div className="flex items-center gap-3 pt-1 text-sm text-muted-foreground">
            <DownloadIcon className="h-4 w-4 text-primary" aria-hidden />
            <span>Tiny native build — no account, no sign-up.</span>
          </div>

          <div className="pt-2">
            <GitHubStarPill label="Browse the source on GitHub" />
          </div>
        </div>
      </div>
    </section>
  );
}
