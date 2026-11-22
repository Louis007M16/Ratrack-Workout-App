import type { Overload, Workout } from "@/types/workout"
export type { Overload }

export type Perf = { weightKg: number; reps: number }
export type Suggestion = { weightsKg: number[]; reps: number[]; increase: boolean; message: string }

const normalSets = (w: Pick<Workout, "sets">) => w.sets.filter((s) => s.type === "normal")

const LAST_SET_FEWER = 2
const RESTART_REPS = 8
const restartReps = (o: Overload) =>
  Math.max(1, (o as Overload & { resetReps?: number }).resetReps ?? RESTART_REPS)

export function suggestNext(last: Perf[] | undefined, w: Pick<Workout, "sets" | "overload">): Suggestion | null {
  const planned = normalSets(w)
  if (!w.overload.on || !last || last.length === 0 || planned.length === 0) return null
  if (planned.some((p) => p.reps == null)) return null

  const top = (i: number) => planned[i].reps as number
  const lastKg = (i: number) => last[i]?.weightKg ?? planned[i].weightKg ?? 0

  const hit = planned.every((_, i) => last[i] != null && last[i].reps >= top(i))
  const restart = restartReps(w.overload)

  if (hit) {
    return {
      weightsKg: planned.map((_, i) => lastKg(i) + w.overload.stepKg),
      reps: planned.map((_, i) => {
        const base = Math.min(restart, top(i))
        const isLastSet = planned.length > 1 && i === planned.length - 1
        return isLastSet ? Math.max(1, base - LAST_SET_FEWER) : base
      }),
      increase: true,
      message: `You hit your reps on every set. Add weight and restart at ${restart} reps (${LAST_SET_FEWER} fewer on the last set).`,
    }
  }

  return {
    weightsKg: planned.map((_, i) => lastKg(i)),
    reps: planned.map((_, i) => (last[i] ? Math.min(top(i), last[i].reps + 1) : top(i))), // one more rep
    increase: false,
    message: "Keep the weight and add one rep to each set.",
  }
}

export function suggestedSets(w: Pick<Workout, "sets">, sug: Suggestion): Perf[] {
  return normalSets(w).map((p, i) => ({
    weightKg: sug.weightsKg[i] ?? p.weightKg ?? 0,
    reps: sug.reps[i] ?? p.reps ?? 0,
  }))
}