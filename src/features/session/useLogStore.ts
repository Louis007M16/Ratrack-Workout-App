import { create } from 'zustand';
import type { PlannedSet, Workout } from '@/types/workout';
import type { LogSet } from '@/types/log';
import { enqueue } from '@/db/queue';
import {
  insertSets,
  loadDerived,
  resetRows,
  setAllDoneRows,
  setDoneRow,
  setTargetsById,
  type LoadedLog,
  type Pr,
} from '@/db/log';
import { type Perf, type Suggestion, suggestNext } from './overload';

export type { LogSet };
export const EMPTY: LogSet[] = [];

export type ToggleResult =
  | { error: string }
  | {
      error?: undefined;
      nowDone: boolean;
      pr: boolean;
      finished: boolean;
      next: Suggestion | null;
    };

type Ctx = { splitId: string | null; dayLabel: string };

type State = {
  sessions: Record<string, Record<string, LogSet[]>>; // dateKey -> workoutId -> sets
  history: Record<string, Perf[]>; // most recent finished session per workout
  prs: Record<string, Pr>; // best set per workout

  ensureSets: (key: string, w: Workout, ctx?: Ctx) => void;
  toggleDone: (key: string, w: Workout, setId: string) => ToggleResult;
  setAllDone: (key: string, w: Workout, done: boolean) => ToggleResult;
  applySuggestion: (key: string, w: Workout) => void;
  resetDay: (key: string, workoutIds: string[]) => void;
};

const persisted = new Set<string>(); // "date:workoutId" rows already in the database
const ctxs: Record<string, Ctx> = {};
const pk = (key: string, id: string) => `${key}:${id}`;

export function hydrateLog(data: LoadedLog) {
  for (const [date, day] of Object.entries(data.sessions))
    for (const id of Object.keys(day)) persisted.add(pk(date, id));
  useLogStore.setState(data);
}

function persistRows(key: string, w: Workout) {
  if (persisted.has(pk(key, w.id))) return;
  persisted.add(pk(key, w.id));
  const sets = useLogStore.getState().sessions[key]?.[w.id];
  if (!sets) return;
  const ctx = ctxs[key] ?? { splitId: null, dayLabel: '' };
  void enqueue(() => insertSets(key, ctx, { id: w.id, name: w.name }, sets));
}

function refreshDerived(workoutId: string) {
  void enqueue(async () => {
    const d = await loadDerived(workoutId);
    useLogStore.setState((s: State) => {
      const history = { ...s.history };
      const prs = { ...s.prs };
      if (d.history) history[workoutId] = d.history;
      else delete history[workoutId];
      if (d.pr != null) prs[workoutId] = d.pr;
      else delete prs[workoutId];
      return { history, prs };
    });
  });
}

function buildSets(w: Workout, last: Perf[] | undefined): LogSet[] {
  const sug = suggestNext(last, w);
  const planned: PlannedSet[] = w.sets.length
    ? w.sets
    : Array.from({ length: 3 }, () => ({
        type: 'normal' as const,
        weightKg: null,
        reps: null,
        drops: [],
      }));
  let n = -1;
  return planned.map((p) => {
    if (p.type === 'normal') n++;
    const weight =
      p.type === 'normal' && sug ? sug.weightsKg[n] ?? p.weightKg : p.weightKg;
    const reps = p.type === 'normal' && sug ? sug.reps[n] ?? p.reps : p.reps;
    return {
      id: crypto.randomUUID(),
      type: p.type,
      weightKg: weight,
      reps,
      drops: p.drops.map((d) => ({ ...d })),
      done: false,
    };
  });
}

const write = (s: State, key: string, id: string, sets: LogSet[]) => ({
  sessions: { ...s.sessions, [key]: { ...s.sessions[key], [id]: sets } },
});

const incomplete = (x: LogSet) =>
  [x, ...x.drops].some(
    (st) => st.weightKg == null || st.reps == null || st.reps < 1
  );

const NEEDS_PLAN =
  'Add weight and reps for this workout in the Workouts tab first';

const beats = (old: Pr | undefined, kg: number, reps: number) =>
  !old ||
  kg > old.weightKg + 0.005 ||
  (Math.abs(kg - old.weightKg) <= 0.005 && reps > old.reps);

export const useLogStore = create<State>()((set, get) => ({
  sessions: {},
  history: {},
  prs: {},

  ensureSets: (key: string, w: Workout, ctx?: Ctx) => {
    if (ctx) ctxs[key] = ctx;
    if (get().sessions[key]?.[w.id]) return;
    set((s: State) => write(s, key, w.id, buildSets(w, s.history[w.id])));
  },

  toggleDone: (key: string, w: Workout, setId: string): ToggleResult => {
    const state = get();
    const sets = state.sessions[key]?.[w.id];
    const target = sets?.find((x) => x.id === setId);
    if (!sets || !target) return { error: 'Set not found' };

    const nowDone = !target.done;
    if (nowDone && incomplete(target)) return { error: NEEDS_PLAN };

    const next = sets.map((x) =>
      x.id === setId ? { ...x, done: nowDone } : x
    );

    let pr = false;
    const prs = { ...state.prs };
    if (
      nowDone &&
      target.type === 'normal' &&
      beats(prs[w.id], target.weightKg as number, target.reps as number)
    ) {
      prs[w.id] = {
        weightKg: target.weightKg as number,
        reps: target.reps as number,
      };
      pr = true;
    }

    const finished = nowDone && next.every((x) => x.done);
    let history = state.history;
    let suggestion: Suggestion | null = null;
    if (finished) {
      const perf: Perf[] = next
        .filter(
          (x) => x.type === 'normal' && x.weightKg != null && x.reps != null
        )
        .map((x) => ({
          weightKg: x.weightKg as number,
          reps: x.reps as number,
        }));
      if (perf.length) {
        history = { ...history, [w.id]: perf };
        suggestion = suggestNext(perf, w);
      }
    }

    persistRows(key, w); // must run before the change below
    set((s: State) => ({ ...write(s, key, w.id, next), prs, history }));
    void enqueue(() => setDoneRow(setId, nowDone));
    refreshDerived(w.id);
    return { nowDone, pr, finished, next: suggestion };
  },

  setAllDone: (key: string, w: Workout, done: boolean): ToggleResult => {
    const state = get();
    const sets = state.sessions[key]?.[w.id];
    if (!sets || sets.length === 0)
      return { error: 'This workout has no sets' };

    if (!done) {
      persistRows(key, w);
      set((s: State) =>
        write(
          s,
          key,
          w.id,
          sets.map((x) => ({ ...x, done: false }))
        )
      );
      void enqueue(() => setAllDoneRows(key, w.id, false));
      refreshDerived(w.id);
      return { nowDone: false, pr: false, finished: false, next: null };
    }
    if (sets.some(incomplete)) return { error: NEEDS_PLAN };

    const next = sets.map((x) => ({ ...x, done: true }));
    let top: Pr | null = null;
    for (const x of next) {
      if (x.type !== 'normal') continue;
      const cand = { weightKg: x.weightKg as number, reps: x.reps as number };
      if (!top || beats(top, cand.weightKg, cand.reps)) top = cand;
    }
    const prs = { ...state.prs };
    let pr = false;
    if (top && beats(prs[w.id], top.weightKg, top.reps)) {
      prs[w.id] = top;
      pr = true;
    }

    const perf: Perf[] = next
      .filter((x) => x.type === 'normal')
      .map((x) => ({ weightKg: x.weightKg as number, reps: x.reps as number }));
    const history = perf.length
      ? { ...state.history, [w.id]: perf }
      : state.history;
    const suggestion = perf.length ? suggestNext(perf, w) : null;

    persistRows(key, w);
    set((s: State) => ({ ...write(s, key, w.id, next), prs, history }));
    void enqueue(() => setAllDoneRows(key, w.id, true));
    refreshDerived(w.id);
    return { nowDone: true, pr, finished: true, next: suggestion };
  },

  applySuggestion: (key: string, w: Workout) => {
    const s0 = get();
    const sets = s0.sessions[key]?.[w.id];
    const sug = suggestNext(s0.history[w.id], w);
    if (!sets || !sug) return;
    persistRows(key, w);
    let n = -1;
    const changed: { id: string; weightKg: number; reps: number }[] = [];
    const next = sets.map((x) => {
      if (x.type !== 'normal') return x;
      n++;
      const kg = sug.weightsKg[n];
      const reps = sug.reps[n];
      if (x.done || kg == null || reps == null) return x;
      changed.push({ id: x.id, weightKg: kg, reps });
      return { ...x, weightKg: kg, reps };
    });
    set((s: State) => write(s, key, w.id, next));
    void enqueue(() => setTargetsById(changed));
  },

  resetDay: (key: string, workoutIds: string[]) => {
    set((s: State) => {
      const day = s.sessions[key];
      if (!day) return s;
      const copy = { ...day };
      for (const id of workoutIds)
        if (copy[id]) copy[id] = copy[id].map((x) => ({ ...x, done: false }));
      return { sessions: { ...s.sessions, [key]: copy } };
    });
    const saved = workoutIds.filter((id) => persisted.has(pk(key, id)));
    if (saved.length) {
      void enqueue(() => resetRows(key, saved));
      saved.forEach(refreshDerived);
    }
  },
}));
