import {
  WifiOff,
  Keyboard,
  AppWindow,
  Languages,
  ShieldCheck,
  Feather,
  Cloud,
  Lock,
  type LucideIcon,
} from "lucide-react";
import Waveform from "@/components/Waveform";
import Reveal from "@/components/Reveal";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const small: Feature[] = [
  {
    icon: Keyboard,
    title: "Global push-to-talk",
    description:
      "Hold a hotkey from anywhere on your system to dictate, release to stop. No window to switch to, no button to find.",
  },
  {
    icon: AppWindow,
    title: "Drops into any app",
    description:
      "Text is typed straight into whatever app has focus: editor, browser, terminal, or chat.",
  },
  {
    icon: Languages,
    title: "Speaks your language",
    description:
      "Multilingual dictation with natural punctuation and casing, so the text reads the way you meant it.",
  },
  {
    icon: Feather,
    title: "Fast & lightweight",
    description:
      "Built on Tauri, a tiny native app that launches instantly and stays out of your way.",
  },
];

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <Reveal className="max-w-2xl">
        <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          Dictation that gets out of your way
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Everything happens on your machine, in the apps you already use. No new
          workflow to learn, just speak.
        </p>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Featured: on-device */}
        <Reveal className="sm:col-span-2" delay={0}>
          <div className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <WifiOff className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-xl font-medium tracking-tight text-card-foreground">
              Transcribes on-device
            </h3>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Speech recognition runs locally with NVIDIA Parakeet or Whisper.
              No cloud round-trip, no internet required. It works on a plane
              just as well as at your desk.
            </p>
            <div className="mt-auto flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3">
              <Waveform bars={32} className="h-8 flex-1" />
              <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                local
              </span>
            </div>
          </div>
        </Reveal>

        {/* Two small */}
        {small.slice(0, 2).map(({ icon: Icon, title, description }, i) => (
          <Reveal key={title} delay={80 + i * 80}>
            <div className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-xl font-medium tracking-tight text-card-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </Reveal>
        ))}

        {/* Two small */}
        {small.slice(2).map(({ icon: Icon, title, description }, i) => (
          <Reveal key={title} delay={i * 80}>
            <div className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-xl font-medium tracking-tight text-card-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </Reveal>
        ))}

        {/* Featured: private by design */}
        <Reveal className="sm:col-span-2" delay={160}>
          <div className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-xl font-medium tracking-tight text-card-foreground">
              Private by design
            </h3>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Your audio never leaves the device. No account, no telemetry, no
              recordings in the cloud. What you say stays with you.
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-foreground">
                <Lock className="h-3.5 w-3.5 text-primary" aria-hidden />
                Stays on your Mac &amp; PC
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-muted-foreground line-through decoration-muted-foreground/40">
                <Cloud className="h-3.5 w-3.5" aria-hidden />
                Cloud upload
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
