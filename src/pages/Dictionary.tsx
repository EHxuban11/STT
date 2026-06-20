import { Link } from "react-router-dom";
import { Plus, Settings, Trash2 } from "lucide-react";
import { HeroCard } from "@/components/ui";
import { saveDictionary, useStore } from "@/lib/store";
import type { DictEntry } from "@/lib/store";

function normalizeEntry(entry: DictEntry): DictEntry {
  return {
    from: entry.from.replace(/\s+/g, " ").trimStart(),
    to: entry.to.replace(/\s+/g, " ").trimStart(),
  };
}

export default function Dictionary() {
  const dictionary = useStore((s) => s.dictionary);
  const dictionaryMode = useStore((s) => s.dictionaryMode);

  function addEntry() {
    saveDictionary([...dictionary, { from: "", to: "" }]);
  }

  function updateEntry(index: number, patch: Partial<DictEntry>) {
    saveDictionary(
      dictionary.map((entry, i) =>
        i === index ? normalizeEntry({ ...entry, ...patch }) : entry
      )
    );
  }

  function removeEntry(index: number) {
    saveDictionary(dictionary.filter((_, i) => i !== index));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Dictionary</h1>
          <p className="text-sm text-muted">Teach the app names, products, and phrases you use often.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/settings?section=Dictionary"
            className="btn-secondary px-3.5 py-2 text-[13px]"
          >
            <Settings size={15} /> Settings
          </Link>
          <button onClick={addEntry} className="btn-primary px-3.5 py-2 text-[13px]">
            <Plus size={15} /> Add Word
          </button>
        </div>
      </div>

      <HeroCard
        title="Words that belong to you."
        body={
          dictionaryMode === "off"
            ? "Dictionary replacements are currently off. Your entries are saved but not applied."
            : "Post-processing replacements are applied after local speech recognition, before text is inserted or shown."
        }
      />

      {dictionary.length === 0 ? (
        <div className="border-t border-line pt-8 text-center text-sm text-muted">
          No vocabulary words yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_48px] gap-3 border-b border-line bg-card px-4 py-2 text-xs font-semibold uppercase text-muted">
            <div>When you say</div>
            <div>Write as</div>
            <div />
          </div>
          <div className="divide-y divide-line">
            {dictionary.map((entry, index) => (
              <div
                key={index}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_48px] items-center gap-3 px-4 py-3"
              >
                <input
                  value={entry.from}
                  onChange={(event) => updateEntry(index, { from: event.target.value })}
                  onBlur={(event) =>
                    updateEntry(index, { from: event.target.value.trim() })
                  }
                  placeholder="git hub"
                  className="min-w-0 rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <input
                  value={entry.to}
                  onChange={(event) => updateEntry(index, { to: event.target.value })}
                  onBlur={(event) => updateEntry(index, { to: event.target.value.trim() })}
                  placeholder="GitHub"
                  className="min-w-0 rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <button
                  onClick={() => removeEntry(index)}
                  className="btn-ghost justify-center p-2 text-muted hover:text-red-500"
                  title="Remove word"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
