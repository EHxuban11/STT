import { Mic, Cpu, Type, CloudOff, Check, ArrowDown } from "lucide-react";
import Reveal from "@/components/Reveal";
import Waveform from "@/components/Waveform";

const points = [
  "No account, no sign-up, no telemetry.",
  "Audio is transcribed locally and never stored.",
  "Open source, so you can audit exactly what it does.",
];

export default function Privacy() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
            <CloudOff className="h-3.5 w-3.5" aria-hidden />
            Private by default
          </span>
          <h2 className="mt-5 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            Your words never touch the cloud
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Most dictation tools stream your voice to someone else&apos;s
            servers. Yawning Face does the whole thing on your own machine,
            so privacy isn&apos;t a setting you have to trust, it&apos;s how it
            works.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-foreground">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                <span className="text-sm leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Visual: local data-flow */}
        <Reveal delay={120}>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
            <div className="bg-dots pointer-events-none absolute inset-0 opacity-60" aria-hidden />

            {/* floating crossed-out cloud */}
            <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <CloudOff className="h-3.5 w-3.5" aria-hidden />
              0 bytes uploaded
            </div>

            <div className="relative flex flex-col items-center gap-3">
              <FlowStep icon={Mic} label="You speak" caption="Microphone" />
              <ArrowDown className="h-5 w-5 text-muted-foreground/50" aria-hidden />

              {/* on-device core */}
              <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-5">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Cpu className="h-6 w-6" aria-hidden />
                </span>
                <span className="text-sm font-medium text-foreground">
                  Transcribed on your device
                </span>
                <Waveform bars={26} className="h-6 w-full opacity-90" />
              </div>

              <ArrowDown className="h-5 w-5 text-muted-foreground/50" aria-hidden />
              <FlowStep icon={Type} label="Typed into your app" caption="Anywhere you're focused" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FlowStep({
  icon: Icon,
  label,
  caption,
}: {
  icon: typeof Mic;
  label: string;
  caption: string;
}) {
  return (
    <div className="flex w-full max-w-xs items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-soft">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </span>
    </div>
  );
}
