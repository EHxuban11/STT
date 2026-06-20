import { Download, ArrowRight, Cpu, ShieldCheck, Github, Laptop } from "lucide-react";

const trustPills = [
  { icon: Cpu, label: "On-device" },
  { icon: ShieldCheck, label: "No account" },
  { icon: Github, label: "Open source" },
  { icon: Laptop, label: "Windows · macOS" },
];

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="flex max-w-3xl flex-col items-start gap-6 animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          Voice-first dictation for your desktop
        </span>

        <h1 className="text-5xl font-medium leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Hold a key, talk,
          <br />
          and your words just <span className="text-primary">appear</span>.
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Yawning Face STT turns your voice into text wherever you&apos;re typing.
          Press a global hotkey, speak naturally, and the transcription lands
          straight into the app you&apos;re in — emails, code, chats, docs. It runs
          entirely on your machine, so nothing you say ever leaves the device.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#download"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download for Windows · macOS
          </a>
          <a
            href="#how-it-works"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
          >
            See how it works
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>

        <ul className="mt-2 flex flex-wrap gap-2.5">
          {trustPills.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
