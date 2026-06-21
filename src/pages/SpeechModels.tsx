import { Cloud, Cpu, Download, Globe, Languages, Loader2, MonitorCog } from "lucide-react";
import { ProviderRow, SectionLabel, SetupBadge } from "@/components/ui";
import { CLOUD_STT, LOCAL_ENGLISH, LOCAL_MULTI, LocalModel } from "@/lib/data";
import { downloadModel } from "@/lib/models";
import { getState, setState, useStore } from "@/lib/store";
import { invoke } from "@/lib/tauri";

function parseSize(s: string): number {
  const m = s.match(/([\d.]+)\s*(MB|GB)/i);
  if (!m) return 100_000_000;
  const n = parseFloat(m[1]);
  return Math.round(n * (m[2].toUpperCase() === "GB" ? 1e9 : 1e6));
}

function OpenAIKnot() {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.9 2.4c1.4 0 2.7.7 3.4 1.8 1.4-.2 2.8.4 3.6 1.6.7 1.2.7 2.6 0 3.7.8 1.1.9 2.6.2 3.8-.7 1.3-2 2-3.4 1.9-.6 1.3-1.9 2.1-3.3 2.1-1.4 0-2.7-.7-3.4-1.8-1.4.2-2.8-.4-3.6-1.6-.7-1.2-.7-2.6 0-3.7-.8-1.1-.9-2.6-.2-3.8.7-1.3 2-2 3.4-1.9.6-1.3 1.9-2.1 3.3-2.1Zm.1 3.1-2.8 1.6v3.1l2.8 1.6 2.8-1.6V7.1L12 5.5Zm-1.4 2.4L12 7.1l1.4.8v1.6l-1.4.8-1.4-.8V7.9Zm-3.4-.8c-.6.1-1.1.5-1.4 1-.3.6-.2 1.2.1 1.7l1.6-.9V7.1h-.3Zm9.6 0h-.3v1.8l1.6.9c.3-.5.3-1.1.1-1.7-.3-.5-.8-.9-1.4-1Zm-11 4.8c-.3.5-.3 1.1 0 1.6.3.6.8.9 1.4 1h.3v-1.8l-1.7-.8Zm12.4 0-1.7.8v1.8h.3c.6-.1 1.1-.4 1.4-1 .3-.5.3-1.1 0-1.6Zm-9 1.3v1.8c.3.5.8.8 1.4.8.6 0 1.1-.3 1.4-.8l-2.8-1.8Zm5.6 0L12 15c.3.5.8.8 1.4.8.6 0 1.1-.3 1.4-.8v-1.8Z"
      />
    </svg>
  );
}

function ParakeetLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M3 12s3.2-4.5 9-4.5S21 12 21 12s-3.2 4.5-9 4.5S3 12 3 12Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M9.5 10.5 14 8.8l-1.3 4.7 2.5 1.5"
      />
    </svg>
  );
}

function ModelTile({ kind }: { kind: LocalModel["kind"] }) {
  if (kind === "parakeet") {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-950 text-zinc-200">
        <ParakeetLogo />
      </div>
    );
  }

  return (
    <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white">
      <OpenAIKnot />
    </div>
  );
}

function pct(d: { done: number; total: number }) {
  return d.total ? Math.min(100, Math.round((d.done / d.total) * 100)) : 0;
}

export default function SpeechModels() {
  const selected = useStore((s) => s.selectedModelId);
  const installed = useStore((s) => s.installed);
  const downloads = useStore((s) => s.downloads);

  const renderModels = (group: string, models: LocalModel[]) =>
    models.map((m) => {
      const id = `${group}:${m.name}`;
      const backendId = m.backendId;
      const dl = backendId ? downloads[backendId] : undefined;
      const isInstalled = !!backendId && installed.includes(backendId);
      const isAvailable = !!backendId;

      const selectModel = () => {
        if (!backendId) return;
        setState({ selectedModelId: id, selectedModelName: m.name, activeModelId: backendId });
        invoke("set_active_model", { id: backendId });
      };

      const onClick = async () => {
        if (dl) return;
        if (!backendId) return;
        if (isInstalled) {
          selectModel();
        } else {
          await downloadModel(backendId, parseSize(m.size));
          if (getState().installed.includes(backendId)) selectModel();
        }
      };

      const right = dl ? (
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Loader2 size={14} className="animate-spin" /> {pct(dl)}%
        </span>
      ) : !isAvailable ? (
        <span className="text-xs font-semibold text-faint">Coming soon</span>
      ) : isInstalled ? undefined : (
        <Download size={16} className="text-faint" />
      );

      return (
        <ProviderRow
          key={id}
          logo={<ModelTile kind={m.kind} />}
          name={m.name}
          sub={dl ? `Downloading... ${pct(dl)}%` : isAvailable ? m.size : `${m.size} - Coming soon`}
          selected={selected === id}
          onClick={onClick}
          right={right}
          disabled={!isAvailable || !!dl}
        />
      );
    });

  return (
    <div className="mx-auto max-w-5xl space-y-1 pt-2">
      <SectionLabel>
        <MonitorCog size={14} /> Local
      </SectionLabel>

      <div className="mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
        <Languages size={12} /> English only
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {renderModels("en", LOCAL_ENGLISH)}
      </div>

      <div className="mb-1 mt-4 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
        <Globe size={12} /> Multilingual
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {renderModels("ml", LOCAL_MULTI)}
      </div>

      <SectionLabel>
        <Cpu size={14} /> GPU Acceleration
      </SectionLabel>
      <ProviderRow
        logo={
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600/90 text-white">
            <Cpu size={18} />
          </div>
        }
        name="NVIDIA CUDA"
        sub="RTX 2000+ - ~631 MB - No CUDA install needed"
        right={<span className="text-xs font-semibold text-faint">Coming soon</span>}
        disabled
      />

      <SectionLabel>
        <Cloud size={14} /> Cloud / AI Providers
      </SectionLabel>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {CLOUD_STT.map((p, i) => (
          <ProviderRow
            key={`${p.name}-${p.sub}-${i}`}
            logo={<span className="text-xs font-bold text-muted">{p.name.charAt(0)}</span>}
            name={p.name}
            sub={p.sub}
            right={<SetupBadge />}
          />
        ))}
      </div>
    </div>
  );
}
