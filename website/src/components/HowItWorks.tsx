import { Keyboard, Mic, Type, type LucideIcon } from "lucide-react";

type Step = {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    icon: Keyboard,
    step: "01",
    title: "Hold the hotkey",
    description:
      "Press and hold your global shortcut from inside any app. Yawning Face starts listening instantly — no window swap needed.",
  },
  {
    icon: Mic,
    step: "02",
    title: "Speak naturally",
    description:
      "Talk the way you normally would. The on-device model transcribes in real time and adds punctuation as you go.",
  },
  {
    icon: Type,
    step: "03",
    title: "Watch it land",
    description:
      "Release the key and your text is typed straight into the focused app, ready to send, save, or keep editing.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-border/60 bg-secondary/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            Three steps, start to finish
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            From thought to typed text in the time it takes to say the sentence.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, description }) => (
            <div
              key={step}
              className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="font-heading text-2xl font-medium text-muted-foreground/50">
                  {step}
                </span>
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
      </div>
    </section>
  );
}
