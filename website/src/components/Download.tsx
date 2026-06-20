import { Download as DownloadIcon, Apple, Monitor, ShieldCheck } from "lucide-react";
import GitHubStarPill from "@/components/GitHubStarPill";
import Reveal from "@/components/Reveal";

const RELEASES_URL = "https://github.com/yawningface/releases";

export default function Download() {
  return (
    <section id="download" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-card md:p-16">
          {/* warm backdrop */}
          <div className="bg-dots pointer-events-none absolute inset-0 opacity-70" aria-hidden />
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-6">
            <span className="text-5xl leading-none animate-float" aria-hidden>
              🥱
            </span>
            <h2 className="max-w-2xl text-3xl font-medium tracking-tight text-card-foreground md:text-5xl">
              Stop typing what you could just{" "}
              <span className="text-gradient-amber">say</span>
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Download Yawning Face STT and start dictating in minutes. Free,
              open source, and running entirely on your machine.
            </p>

            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary/80 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
              >
                <Monitor className="h-4 w-4" aria-hidden />
                Download for Windows
              </a>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
              >
                <Apple className="h-4 w-4" aria-hidden />
                Download for macOS
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <DownloadIcon className="h-3.5 w-3.5 text-primary" aria-hidden />
                Tiny native build
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                No account, no sign-up
              </span>
            </div>

            <div className="pt-2">
              <GitHubStarPill label="Browse the source on GitHub" />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
