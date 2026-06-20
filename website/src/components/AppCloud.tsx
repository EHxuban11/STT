import {
  Mail,
  MessageSquare,
  FileText,
  Code2,
  Terminal,
  Globe,
  StickyNote,
  Table2,
  PenLine,
  Search,
  type LucideIcon,
} from "lucide-react";

const apps: { icon: LucideIcon; label: string }[] = [
  { icon: Mail, label: "Email" },
  { icon: MessageSquare, label: "Chat" },
  { icon: Code2, label: "Your editor" },
  { icon: FileText, label: "Docs" },
  { icon: Terminal, label: "Terminal" },
  { icon: Globe, label: "Browser" },
  { icon: StickyNote, label: "Notes" },
  { icon: Table2, label: "Sheets" },
  { icon: PenLine, label: "Forms" },
  { icon: Search, label: "Search bars" },
];

export default function AppCloud() {
  return (
    <section className="border-y border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <p className="text-center text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          If you can type into it, you can talk into it
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {apps.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
