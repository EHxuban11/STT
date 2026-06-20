import { Github, Linkedin } from "lucide-react";
import Logo from "@/components/Logo";
import GitHubStarPill from "@/components/GitHubStarPill";

const productLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
  { href: "#download", label: "Download" },
];

const REPO_URL = "https://github.com/yawningface";
const LINKEDIN_URL = "https://www.linkedin.com/in/xuban-ceccon/";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Voice-first, on-device dictation for your desktop. Speak, and
              it&apos;s typed for you, privately, in any app.
            </p>
            <GitHubStarPill />
          </div>

          {/* Product */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Product
            </h3>
            <ul className="flex flex-col gap-2.5">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Creator */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Made by
            </h3>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
                XC
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  Xuban Ceccon
                </span>
                <span className="text-xs text-muted-foreground">
                  Creator &amp; maintainer
                </span>
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="LinkedIn"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-soft"
              >
                <Linkedin className="h-4 w-4" aria-hidden />
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="GitHub"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-soft"
              >
                <Github className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} YawningFace, an independent project.</p>
          <p>Built by Xuban Ceccon.</p>
        </div>
      </div>
    </footer>
  );
}
