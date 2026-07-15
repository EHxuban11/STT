import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AudioWaveform, ChevronDown, Plus, Settings, Trash2 } from "lucide-react";
import { HeroCard, Toggle } from "@/components/ui";
import {
  saveDecoderVocabularyEnabled,
  saveDictionary,
  saveVocabulary,
  showToast,
  useStore,
} from "@/lib/store";
import type { DictEntry } from "@/lib/store";

function normalizeText(value: string): string {
  return Array.from(value.replace(/\s+/g, " ").trim())
    .slice(0, 120)
    .join("")
    .trimEnd();
}

function normalizeEntry(entry: DictEntry): DictEntry {
  return {
    from: normalizeText(entry.from),
    to: normalizeText(entry.to),
  };
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function Dictionary() {
  const vocabulary = useStore((s) => s.vocabulary);
  const dictionary = useStore((s) => s.dictionary);
  const dictionaryMode = useStore((s) => s.dictionaryMode);
  const decoderVocabularyEnabled = useStore((s) => s.decoderVocabularyEnabled);
  const activeModelId = useStore((s) => s.activeModelId);
  const [newTerm, setNewTerm] = useState("");
  const [newAlias, setNewAlias] = useState<DictEntry>({ from: "", to: "" });
  const [changingDecoderVocabulary, setChangingDecoderVocabulary] = useState(false);
  const vocabularyFull = vocabulary.length >= 500;
  const aliasFull = dictionary.length >= 500;
  const decoderVocabularySupported = activeModelId.startsWith("parakeet-");

  async function changeDecoderVocabulary(enabled: boolean) {
    setChangingDecoderVocabulary(true);
    try {
      await saveDecoderVocabularyEnabled(enabled);
      showToast(
        enabled
          ? "Decoder vocabulary boosting is active for Parakeet."
          : "Decoder vocabulary boosting is off."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(message || "Could not change decoder vocabulary boosting.");
    } finally {
      setChangingDecoderVocabulary(false);
    }
  }

  function addTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = normalizeText(newTerm);
    if (!term || vocabularyFull) return;
    if (vocabulary.some((saved) => saved.toLowerCase() === term.toLowerCase())) {
      showToast(`“${term}” is already in your vocabulary`);
      return;
    }
    saveVocabulary([...vocabulary, term]);
    setNewTerm("");
  }

  function removeTerm(index: number) {
    saveVocabulary(vocabulary.filter((_, i) => i !== index));
  }

  function addAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (aliasFull) {
      showToast("The 500-alias limit has been reached");
      return;
    }
    const entry = normalizeEntry(newAlias);
    const from = entry.from.trim();
    const to = entry.to.trim();
    if (!from || !to) return;
    saveDictionary([...dictionary, { from, to }]);
    setNewAlias({ from: "", to: "" });
  }

  function removeAlias(index: number) {
    saveDictionary(dictionary.filter((_, i) => i !== index));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Vocabulary</h1>
          <p className="text-sm text-muted">Teach the app names, products, and phrases you use often.</p>
        </div>
        <Link
          to="/settings?section=Vocabulary"
          className="btn-secondary px-3.5 py-2 text-[13px]"
        >
          <Settings size={15} /> Cerebras settings
        </Link>
      </div>

      <HeroCard
        title="Words that belong to you."
        body={
          decoderVocabularyEnabled
            ? dictionaryMode === "cerebras"
              ? "Parakeet biases beam-search decoding toward your preferred vocabulary. Cerebras can then use those terms and exact aliases to correct remaining recognition mistakes."
              : dictionaryMode === "postprocess"
                ? "Parakeet biases beam-search decoding toward your preferred vocabulary. Exact aliases are still applied locally after recognition."
                : "Parakeet biases beam-search decoding toward your preferred vocabulary. Exact aliases and Cerebras processing are off."
            : dictionaryMode === "off"
            ? "Vocabulary processing is off. Your preferred terms and exact aliases remain saved."
            : dictionaryMode === "cerebras"
              ? "For live dictation, Cerebras uses your preferred vocabulary and exact aliases to correct likely recognition mistakes. Up to 500 vocabulary terms and only the first 200 exact aliases may be sent with the local transcription and domain context. File transcription stays local."
              : "Exact aliases are applied locally after speech recognition. Your vocabulary remains saved for Cerebras AI mode."
        }
      />

      <section className="rounded-2xl border border-line bg-card px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-app text-brand">
            <AudioWaveform size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold text-ink">Parakeet decoder vocabulary</h2>
              <span className="rounded-full bg-app px-2 py-0.5 text-[11px] font-semibold text-muted">
                Experimental
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Bias Parakeet's beam search toward the vocabulary below while it decodes the audio.
              This is acoustic decoder context, not a replacement pass over finished text.
            </p>
            <p className="mt-2 text-xs text-faint">
              Parakeet V2/V3 only. The first activation fetches verified tokenizer metadata
              (about 10-100 KB); recordings and vocabulary stay on this device.
            </p>
            {!decoderVocabularySupported && (
              <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                Select an installed Parakeet V2 or V3 model to enable this.
              </p>
            )}
          </div>
          <Toggle
            checked={decoderVocabularyEnabled}
            disabled={
              changingDecoderVocabulary ||
              (!decoderVocabularySupported && !decoderVocabularyEnabled)
            }
            onChange={changeDecoderVocabulary}
            label="Parakeet decoder vocabulary"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line">
        <div className="border-b border-line bg-card px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Vocabulary</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Add each word or phrase exactly as you want it written.
              </p>
            </div>
            <span className="rounded-full bg-app px-2.5 py-1 text-xs font-semibold text-muted">
              {countLabel(vocabulary.length, "term", "terms")}
            </span>
          </div>

          <form onSubmit={addTerm} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={newTerm}
              onChange={(event) => setNewTerm(event.target.value)}
              maxLength={120}
              placeholder={vocabularyFull ? "Vocabulary limit reached" : "Add a word or phrase"}
              aria-label="New vocabulary term"
              disabled={vocabularyFull}
              className="min-w-0 flex-1 rounded-xl border border-line bg-app px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-brand"
            />
            <button
              type="submit"
              disabled={vocabularyFull || !newTerm.trim()}
              className="btn-primary px-4 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} /> Add word
            </button>
          </form>
          <p className="mt-2 text-xs text-faint">
            {vocabularyFull
              ? "The 500-term vocabulary limit has been reached."
              : "Examples: LibreYOLO, worktree, Ultralytics, Roboflow, RF-DETR."}
          </p>
        </div>

        {vocabulary.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">No vocabulary terms yet</div>
        ) : (
          <div className="divide-y divide-line">
            {vocabulary.map((term, index) => (
              <div key={`${term}-${index}`} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 break-words text-sm font-medium text-ink">{term}</span>
                <button
                  type="button"
                  onClick={() => removeTerm(index)}
                  className="btn-ghost justify-center p-2 text-muted hover:text-red-500"
                  title={`Remove ${term}`}
                  aria-label={`Remove ${term}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <details className="group overflow-hidden rounded-2xl border border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-card px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Exact aliases (optional)</h2>
            <p className="mt-1 text-[13px] text-muted">
              Add a spoken shortcut or a known misrecognition and what it should become.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-app px-2.5 py-1 text-xs font-semibold text-muted">
              {countLabel(dictionary.length, "alias", "aliases")}
            </span>
            <ChevronDown
              size={17}
              aria-hidden="true"
              className="text-muted transition-transform group-open:rotate-180"
            />
          </div>
        </summary>

        <div className="border-t border-line">
          <form
            onSubmit={addAlias}
            className="grid gap-3 border-b border-line px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold uppercase text-muted">When you say</span>
              <input
                value={newAlias.from}
                onChange={(event) =>
                  setNewAlias((entry) => ({ ...entry, from: event.target.value }))
                }
                maxLength={120}
                placeholder={aliasFull ? "Alias limit reached" : "r f detector"}
                disabled={aliasFull}
                className="w-full rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-brand disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold uppercase text-muted">Write as</span>
              <input
                value={newAlias.to}
                onChange={(event) =>
                  setNewAlias((entry) => ({ ...entry, to: event.target.value }))
                }
                maxLength={120}
                placeholder={aliasFull ? "Alias limit reached" : "RF-DETR"}
                disabled={aliasFull}
                className="w-full rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-brand disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <button
              type="submit"
              disabled={aliasFull || !newAlias.from.trim() || !newAlias.to.trim()}
              className="btn-secondary self-end px-3.5 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} /> Add alias
            </button>
            {aliasFull && (
              <p className="text-xs text-faint sm:col-span-3">
                The 500-alias limit has been reached.
              </p>
            )}
          </form>

          {dictionary.length === 0 ? (
            <div className="px-5 py-7 text-center text-sm text-muted">No exact aliases</div>
          ) : (
            <div className="divide-y divide-line">
              {dictionary.map((entry, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_40px] items-center gap-2 px-4 py-3"
                >
                  <span className="min-w-0 break-words text-sm text-ink">{entry.from}</span>
                  <span aria-hidden="true" className="text-center text-sm text-faint">→</span>
                  <span className="min-w-0 break-words text-sm font-medium text-ink">{entry.to}</span>
                  <button
                    type="button"
                    onClick={() => removeAlias(index)}
                    className="btn-ghost justify-center p-2 text-muted hover:text-red-500"
                    title="Remove alias"
                    aria-label={`Remove alias ${index + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
