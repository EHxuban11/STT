import type { Transcription } from "./store";

// Cómputo de métricas de uso a partir del historial de transcripciones.
// Todo es REAL (derivado de lo que has dictado); nada inventado.

const STOPWORDS = new Set(
  (
    "the a an and or but to of in on at for with from by as is are was were be been being this that " +
    "these those it its it's i i'm im you you're your we we're they them he she his her our us my me " +
    "mine do does did doing done have has had having will would can could should shall may might must " +
    "not no yes so if then than there here what which who whom whose when where why how all any both " +
    "each few more most other some such only own same too very just like really about into over under " +
    "again once now today get got go going gonna want wanna okay ok yeah yep nope well oh um uh hmm " +
    "one two three also out up down off than because while during before after between"
  ).split(/\s+/)
);

export interface DayCell {
  key: string;
  date: Date;
  words: number;
  count: number;
  future: boolean;
}

export interface Insights {
  totalWords: number;
  sessions: number;
  avgWords: number;
  uniqueWords: number;
  wordsToday: number;
  wordsThisWeek: number;
  wordsThisMonth: number;
  minutesSaved: number;
  pages: number;
  currentStreak: number;
  longestStreak: number;
  topWords: { word: string; count: number }[];
  last14: DayCell[]; // 14 días, antiguo → reciente (gráfico de barras)
  weeks: DayCell[][]; // columnas de 7 (Dom..Sáb) para el heatmap
  maxDayWords: number;
  activeDays: number;
}

const DAY = 86_400_000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeInsights(txs: Transcription[], now = Date.now()): Insights {
  const today0 = startOfDay(now);
  const week0 = today0 - 6 * DAY;
  const month0 = today0 - 29 * DAY;

  // Acumuladores por día y de vocabulario.
  const wordsByDay = new Map<string, number>();
  const countByDay = new Map<string, number>();
  const activeDayKeys = new Set<string>();
  const wordFreq = new Map<string, number>();

  let totalWords = 0;
  let wordsToday = 0;
  let wordsThisWeek = 0;
  let wordsThisMonth = 0;

  for (const t of txs) {
    totalWords += t.words;
    const k = dayKey(t.at);
    wordsByDay.set(k, (wordsByDay.get(k) ?? 0) + t.words);
    countByDay.set(k, (countByDay.get(k) ?? 0) + 1);
    activeDayKeys.add(k);

    const d0 = startOfDay(t.at);
    if (d0 === today0) wordsToday += t.words;
    if (d0 >= week0) wordsThisWeek += t.words;
    if (d0 >= month0) wordsThisMonth += t.words;

    for (const raw of t.text.toLowerCase().split(/[^\p{L}']+/u)) {
      const w = raw.replace(/^'+|'+$/g, "");
      if (w.length < 3 || STOPWORDS.has(w)) continue;
      wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
    }
  }

  const sessions = txs.length;
  const avgWords = sessions ? Math.round(totalWords / sessions) : 0;
  const minutesSaved = Math.round((totalWords / 130) * 10) / 10; // ~130 ppm tecleando
  const pages = Math.round((totalWords / 500) * 10) / 10; // ~500 palabras por página

  // Racha actual: días consecutivos terminando hoy (o ayer si aún no has dictado hoy).
  let currentStreak = 0;
  {
    let cursor = today0;
    if (!activeDayKeys.has(dayKey(cursor))) cursor -= DAY; // permite que termine ayer
    while (activeDayKeys.has(dayKey(cursor))) {
      currentStreak++;
      cursor -= DAY;
    }
  }

  // Racha más larga sobre el conjunto de días activos.
  let longestStreak = 0;
  {
    const days = [...activeDayKeys]
      .map((k) => {
        const [y, m, d] = k.split("-").map(Number);
        return new Date(y, m, d).getTime();
      })
      .sort((a, b) => a - b);
    let run = 0;
    let prev = NaN;
    for (const d of days) {
      run = !Number.isNaN(prev) && d - prev === DAY ? run + 1 : 1;
      if (run > longestStreak) longestStreak = run;
      prev = d;
    }
  }

  // Heatmap: últimas 17 semanas, alineado a domingo.
  const WEEKS = 17;
  const lastSunday = today0 - new Date(today0).getDay() * DAY;
  const gridStart = lastSunday - (WEEKS - 1) * 7 * DAY;
  const weeks: DayCell[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const ts = gridStart + (w * 7 + d) * DAY;
      const k = dayKey(ts);
      col.push({
        key: k,
        date: new Date(ts),
        words: wordsByDay.get(k) ?? 0,
        count: countByDay.get(k) ?? 0,
        future: ts > today0,
      });
    }
    weeks.push(col);
  }

  // Últimos 14 días para el mini gráfico de barras.
  const last14: DayCell[] = [];
  for (let i = 13; i >= 0; i--) {
    const ts = today0 - i * DAY;
    const k = dayKey(ts);
    last14.push({
      key: k,
      date: new Date(ts),
      words: wordsByDay.get(k) ?? 0,
      count: countByDay.get(k) ?? 0,
      future: false,
    });
  }

  const maxDayWords = Math.max(1, ...[...wordsByDay.values()]);

  const topWords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ word, count }));

  return {
    totalWords,
    sessions,
    avgWords,
    uniqueWords: wordFreq.size,
    wordsToday,
    wordsThisWeek,
    wordsThisMonth,
    minutesSaved,
    pages,
    currentStreak,
    longestStreak,
    topWords,
    last14,
    weeks,
    maxDayWords,
    activeDays: activeDayKeys.size,
  };
}
