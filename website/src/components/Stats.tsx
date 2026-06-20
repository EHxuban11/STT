const stats = [
  { value: "100%", label: "Runs on your device" },
  { value: "0", label: "Bytes sent to the cloud" },
  { value: "~50MB", label: "Tiny native download" },
  { value: "∞", label: "Apps it types into" },
];

export default function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1.5 bg-card px-4 py-8 text-center"
          >
            <span className="font-heading text-4xl font-medium tracking-tight text-foreground md:text-5xl">
              {s.value}
            </span>
            <span className="text-sm text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
