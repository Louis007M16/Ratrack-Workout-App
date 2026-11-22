import { create } from "zustand"
import type { Overload, PlannedSet, Workout } from "@/types/workout"
import type { Unit } from "@/lib/units"
import { enqueue } from "@/db/queue"
import { deleteWorkoutRow, writeWorkout } from "@/db/workouts"

type SaveResult = { ok: true } | { ok: false; error: string }

type State = {
  workouts: Workout[]
  save: (w: Omit<Workout, "id"> & { id?: string }) => SaveResult
  updateSets: (id: string, unit: Unit, sets: PlannedSet[]) => void
  setOverload: (id: string, o: Overload) => void
  remove: (id: string) => void
}

export const useWorkoutStore = create<State>()((set, get) => {
  const persist = (id: string) => {
    const w = get().workouts.find((x) => x.id === id)
    if (w) void enqueue(() => writeWorkout(w))
  }

  return {
    workouts: [],

    save: (w: Omit<Workout, "id"> & { id?: string }): SaveResult => {
      const name = w.name.trim()
      const duplicate = get().workouts.some((x) => x.id !== w.id && x.name.toLowerCase() === name.toLowerCase())
      if (duplicate) return { ok: false, error: "You already have a workout with this name" }
      const full: Workout = { ...w, name, id: w.id ?? crypto.randomUUID() }
      set((s: State) => ({
        workouts: w.id ? s.workouts.map((x) => (x.id === full.id ? full : x)) : [...s.workouts, full],
      }))
      persist(full.id)
      return { ok: true }
    },

    updateSets: (id: string, unit: Unit, sets: PlannedSet[]) => {
      set((s: State) => ({ workouts: s.workouts.map((w) => (w.id === id ? { ...w, unit, sets } : w)) }))
      persist(id)
    },

    setOverload: (id: string, o: Overload) => {
      set((s: State) => ({ workouts: s.workouts.map((w) => (w.id === id ? { ...w, overload: o } : w)) }))
      persist(id)
    },

    remove: (id: string) => {
      set((s: State) => ({ workouts: s.workouts.filter((x) => x.id !== id) }))
      void enqueue(() => deleteWorkoutRow(id))
    },
  }
})