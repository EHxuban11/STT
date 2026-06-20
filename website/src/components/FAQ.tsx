import { ChevronDown } from "lucide-react";
import Reveal from "@/components/Reveal";

const faqs = [
  {
    q: "Does it really run completely offline?",
    a: "Yes. The speech model runs locally on your CPU (or GPU). After you download a model, transcription works with no internet connection, on a plane, in a café, anywhere.",
  },
  {
    q: "Which speech models can I use?",
    a: "NVIDIA Parakeet for fast, accurate multilingual dictation, or Whisper if you prefer it. You pick the model and language; everything is downloaded once and cached on your device.",
  },
  {
    q: "Which apps does it work with?",
    a: "Any app with a text field. The transcription is typed into whatever window has focus: your editor, browser, email client, chat app, terminal, or notes.",
  },
  {
    q: "What does it cost?",
    a: "It's free and open source. There's no account, no subscription, and no usage limits, because there's no server doing the work.",
  },
  {
    q: "Which platforms are supported?",
    a: "Windows and macOS today, built on Tauri for a tiny, fast native app. The same on-device experience on both.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Reveal className="text-center">
        <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          Questions, answered
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Everything you might want to know before you start talking.
        </p>
      </Reveal>

      <div className="mt-10 flex flex-col gap-3">
        {faqs.map((f, i) => (
          <Reveal key={f.q} delay={i * 60}>
            <details className="group rounded-2xl border border-border bg-card px-5 transition-colors open:border-primary/40 hover:border-primary/30 [&_summary]:list-none">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 text-left text-base font-medium text-foreground [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180 group-open:text-primary"
                  aria-hidden
                />
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
