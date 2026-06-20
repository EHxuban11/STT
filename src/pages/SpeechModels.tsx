import { Cloud, Languages, Globe, MonitorCog, AudioLines, Bird, Cpu } from "lucide-react";
import { HeroCard, ProviderRow, DownloadIcon, SetupBadge, SectionLabel } from "@/components/ui";
import { CLOUD_STT, LOCAL_ENGLISH, LOCAL_MULTI, LocalModel } from "@/lib/data";
import { useStore, setState } from "@/lib/store";

function ModelTile({ kind }: { kind: LocalModel["kind"] }) {
  if (kind === "parakeet")
    return (
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accentbtn text-app">
        <Bird size={18} />
      </div>
    );
  return (
    <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 text-white">
      <AudioLines size={18} />
    </div>
  );
}

export default function SpeechModels() {
  const selected = useStore((s) => s.selectedModelId);

  const renderModels = (group: string, models: LocalModel[]) =>
    models.map((m) => {
      const id = `${group}:${m.name}`;
      return (
        <ProviderRow
          key={id}
          logo={<ModelTile kind={m.kind} />}
          name={m.name}
          sub={m.size}
          selected={selected === id}
          onClick={() => setState({ selectedModelId: id, selectedModelName: m.name })}
          right={<DownloadIcon />}
        />
      );
    });

  return (
    <div className="mx-auto max-w-5xl space-y-1 pt-2">
      <HeroCard
        title="Choose your transcription engine."
        body="Smaller models are faster. Larger models are more accurate. Pick what fits your workflow."
      />

      <SectionLabel>
        <Cloud size={14} /> Cloud
      </SectionLabel>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {CLOUD_STT.map((p, i) => (
          <ProviderRow
            key={i}
            logo={
              <span className="text-xs font-bold text-muted">{p.name.charAt(0)}</span>
            }
            name={p.name}
            sub={p.sub}
            right={<SetupBadge />}
          />
        ))}
      </div>

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
        sub="RTX 2000+ · ~631 MB · No CUDA install needed"
        right={<DownloadIcon />}
      />
    </div>
  );
}
