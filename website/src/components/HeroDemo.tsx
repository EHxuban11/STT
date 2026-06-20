"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mail,
  MessageSquare,
  Code2,
  FileText,
  Mic,
  type LucideIcon,
} from "lucide-react";
import Waveform from "./Waveform";
import Kbd from "./Kbd";

type Sample = {
  app: string;
  icon: LucideIcon;
  chrome: string;
  lead?: string;
  text: string;
};

const SAMPLES: Sample[] = [
  {
    app: "Mail",
    icon: Mail,
    chrome: "New message",
    lead: "Hi team, ",
    text: "let's ship the on-device build this week. I'll write the release notes.",
  },
  {
    app: "Slack",
    icon: MessageSquare,
    chrome: "#product",
    text: "dictated this whole message without touching the keyboard once.",
  },
  {
    app: "Editor",
    icon: Code2,
    chrome: "notes.ts",
    lead: "// ",
    text: "TODO: trigger dictation with a global hotkey from any window.",
  },
  {
    app: "Notes",
    icon: FileText,
    chrome: "Untitled",
    text: "Groceries: oat milk, good coffee, sourdough, and more coffee.",
  },
];

const TYPE_MS = 38;
const HOLD_MS = 1900;
const CLEAR_MS = 700;

export default function HeroDemo() {
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "clearing">(
    "typing",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sample = SAMPLES[idx];
  const full = (sample.lead ?? "") + sample.text;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setCount(full.length);
      setPhase("holding");
      return;
    }

    if (phase === "typing") {
      if (count < full.length) {
        timer.current = setTimeout(() => setCount((c) => c + 1), TYPE_MS);
      } else {
        timer.current = setTimeout(() => setPhase("holding"), HOLD_MS);
      }
    } else if (phase === "holding") {
      timer.current = setTimeout(() => setPhase("clearing"), 400);
    } else {
      timer.current = setTimeout(() => {
        setCount(0);
        setPhase("typing");
        setIdx((i) => (i + 1) % SAMPLES.length);
      }, CLEAR_MS);
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phase, count, full.length]);

  const typed = full.slice(0, count);
  const leadLen = (sample.lead ?? "").length;
  const Icon = sample.icon;
  const listening = phase === "typing";

  return (
    <div className="relative">
      {/* soft amber glow behind the window */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl"
        aria-hidden
      />

      {/* The app window */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {/* chrome */}
        <div className="flex items-center gap-3 border-b border-border bg-secondary/60 px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#e3ddcd]" />
            <span className="h-3 w-3 rounded-full bg-[#e3ddcd]" />
            <span className="h-3 w-3 rounded-full bg-[#e3ddcd]" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span className="text-foreground">{sample.app}</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground/70">{sample.chrome}</span>
          </div>
        </div>

        {/* body */}
        <div className="min-h-[188px] px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-[15px] leading-relaxed text-foreground sm:text-base">
            <span className="text-muted-foreground">
              {typed.slice(0, Math.min(count, leadLen))}
            </span>
            {count > leadLen ? typed.slice(leadLen) : ""}
            <span
              className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[0.18em] bg-primary align-baseline animate-blink"
              aria-hidden
            />
          </p>
        </div>

        {/* status bar */}
        <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full transition-colors ${
                listening ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
            {listening ? "Transcribing on-device" : "Idle"}
          </span>
          <span className="hidden sm:inline">No internet required</span>
        </div>
      </div>

      {/* Floating "listening" pill, overlapping the window's bottom edge */}
      <div className="absolute -bottom-5 left-1/2 w-[88%] max-w-sm -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2.5 shadow-card backdrop-blur">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {listening && (
              <span
                className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring"
                aria-hidden
              />
            )}
            <Mic className="relative h-4 w-4" aria-hidden />
          </span>

          <Waveform
            bars={22}
            className="h-6 flex-1 opacity-90"
            barClassName={listening ? "bg-primary" : "bg-muted-foreground/30"}
          />

          <span className="hidden shrink-0 items-center gap-1 sm:flex">
            <Kbd>⌘</Kbd>
            <span className="text-muted-foreground">+</span>
            <Kbd>Space</Kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
