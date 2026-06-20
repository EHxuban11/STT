import {
  WifiOff,
  Keyboard,
  AppWindow,
  Languages,
  ShieldCheck,
  Feather,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: WifiOff,
    title: "Transcribes on-device",
    description:
      "Speech recognition runs locally with NVIDIA Parakeet or Whisper. No cloud round-trip, no internet required — it works on a plane just as well as at your desk.",
  },
  {
    icon: Keyboard,
    title: "Global push-to-talk",
    description:
      "Hold a hotkey from anywhere on your system to start dictating, release to stop. No window to switch to, no button to find — your hands stay where they are.",
  },
  {
    icon: AppWindow,
    title: "Drops into any app",
    description:
      "The transcribed text is typed straight into whatever app has focus — your editor, browser, terminal, or chat. If you can type into it, you can talk into it.",
  },
  {
    icon: Languages,
    title: "Speaks your language",
    description:
      "Parakeet handles multilingual dictation with natural punctuation and casing, so the text reads the way you meant it — no manual cleanup afterwards.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    description:
      "Your audio never leaves the device. There's no account, no telemetry, and no recordings stored in the cloud. What you say stays with you.",
  },
  {
    icon: Feather,
    title: "Fast and lightweight",
    description:
      "Built on Tauri, the app is a tiny native download — tens of megabytes, not gigabytes — that launches instantly and stays out of your way.",
  },
];

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          Dictation that gets out of your way
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Everything happens on your machine, in the apps you already use. No new
          workflow to learn — just speak.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="group relative flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
          >
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
        ))}
      </div>
    </section>
  );
}
