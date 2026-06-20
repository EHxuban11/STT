import Logo from "@/components/Logo";
import GitHubStarPill from "@/components/GitHubStarPill";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Voice-first, on-device dictation for your desktop. Speak, and it&apos;s
              typed for you — privately.
            </p>
          </div>
          <GitHubStarPill />
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} YawningFace · An independent project.
          </p>
          <p>
            Built by{" "}
            <span className="font-medium text-foreground">Xuban Ceccon</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
