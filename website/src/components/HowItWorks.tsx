import { Keyboard, Mic, Type, type LucideIcon } from "lucide-react";
import Reveal from "@/components/Reveal";
import Kbd from "@/components/Kbd";

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
      "Press and hold your global shortcut from inside any app. Yawning Face starts listening instantly, no window swap needed.",
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
    <section id="how-it-works" className="border-y border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            Three steps, start to finish
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            From thought to typed text in the time it takes to say the sentence.
          </p>
        </Reveal>

        <div className="relative mt-12">
          {/* connecting line behind the cards */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-[2.4rem] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
            aria-hidden
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map(({ icon: Icon, step, title, description }, i) => (
              <Reveal key={step} delay={i * 120}>
                <div className="relative flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-4 ring-card">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <span className="font-heading text-3xl font-medium text-muted-foreground/30">
                      {step}
                    </span>
                  </div>
                  <h3 className="text-xl font-medium tracking-tight text-card-foreground">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                  {i === 0 && (
                    <div className="mt-auto flex items-center gap-1.5 pt-2">
                      <Kbd>⌘</Kbd>
                      <span className="text-xs text-muted-foreground">+</span>
                      <Kbd>Space</Kbd>
                      <span className="ml-1 text-xs text-muted-foreground">
                        (yours to remap)
                      </span>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
