import { Download, ArrowRight, Cpu, ShieldCheck, Github, Laptop } from "lucide-react";
import HeroDemo from "@/components/HeroDemo";
import Kbd from "@/components/Kbd";

const trustPills = [
  { icon: Cpu, label: "On-device" },
  { icon: ShieldCheck, label: "No account" },
  { icon: Github, label: "Open source" },
  { icon: Laptop, label: "Windows & macOS" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* warm backdrop: dotted texture + amber glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-dots" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* Left: copy */}
        <div className="flex min-w-0 max-w-xl flex-col items-start gap-6 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-pulse-ring" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Voice-first dictation for your desktop
          </span>

          <h1 className="text-5xl font-medium leading-[1.04] tracking-tight text-foreground md:text-6xl lg:text-[4.2rem]">
            Hold a key, talk,
            <br />
            and your words
            <br className="hidden sm:block" /> just{" "}
            <span className="text-gradient-amber">appear</span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Yawning Face STT turns your voice into text wherever you&apos;re
            typing. Press a global hotkey, speak naturally, and the transcription
            lands straight into the app you&apos;re in, entirely on your machine,
            so nothing you say ever leaves the device.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#download"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary/80 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
            >
              See how it works
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Try it:</span>
            <span className="inline-flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <span className="text-muted-foreground">+</span>
              <Kbd>Space</Kbd>
            </span>
            <span>hold, speak, release.</span>
          </div>

          <ul className="mt-1 flex flex-wrap gap-2.5">
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

        {/* Right: live demo */}
        <div className="w-full min-w-0 animate-fade-up [animation-delay:120ms] lg:pl-4">
          <div className="lg:animate-float">
            <HeroDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
