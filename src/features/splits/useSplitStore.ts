import { create } from "zustand"
import type { Muscle } from "@/lib/constants"
import { emptyDay, type DayPlan, type Split } from "@/types/split"
import { enqueue } from "@/db/queue"
import { deleteSplitRow, setActiveRow, writeSplit } from "@/db/splits"

const cloneDays = (days: DayPlan[]): DayPlan[] =>
  days.map((d) => ({ ...d, muscles: [...d.muscles], workoutIds: [...d.workoutIds] }))

type Origin = "list" | "detail"
type Draft = { sourceId: string | null; origin: Origin; name: string; days: DayPlan[] }
type DayDraft = { dow: number; day: DayPlan }
type SaveResult = { ok: true; id: string } | { ok: false; error: string }

type State = {
  splits: Split[]
  draft: Draft | null
  dayDraft: DayDraft | null

  startDraft: (id?: string, origin?: Origin) => void
  setDraftName: (name: string) => void
  discardDraft: () => void
  saveDraft: () => SaveResult

  setActive: (id: string) => void
  duplicate: (id: string) => void
  remove: (id: string) => void
  purgeWorkout: (workoutId: string) => void

  startDay: (dow: number) => void
  patchDay: (p: Partial<DayPlan>) => void
  toggleMuscle: (m: Muscle) => void
  addWorkouts: (ids: string[]) => void
  moveWorkout: (index: number, dir: -1 | 1) => void
  removeWorkout: (index: number) => void
  commitDay: () => void
  discardDay: () => void
}

export const useSplitStore = create<State>()((set, get) => {
  const patchDayDraft = (fn: (d: DayPlan) => DayPlan) =>
    set((s: State) => (s.dayDraft ? { dayDraft: { ...s.dayDraft, day: fn(s.dayDraft.day) } } : s))

  return {
    splits: [],
    draft: null,
    dayDraft: null,

    startDraft: (id?: string, origin: Origin = "list") => {
      const src = id ? get().splits.find((s) => s.id === id) : undefined
      set({
        draft: src
          ? { sourceId: src.id, origin, name: src.name, days: cloneDays(src.days) }
          : { sourceId: null, origin, name: "", days: Array.from({ length: 7 }, emptyDay) },
        dayDraft: null,
      })
    },
    setDraftName: (name: string) => set((s: State) => (s.draft ? { draft: { ...s.draft, name } } : s)),
    discardDraft: () => set({ draft: null, dayDraft: null }),

    saveDraft: (): SaveResult => {
      const { draft, splits } = get()
      if (!draft) return { ok: false, error: "Nothing to save" }
      const name = draft.name.trim()
      if (!name) return { ok: false, error: "Enter a program name" }
      if (splits.some((s) => s.id !== draft.sourceId && s.name.toLowerCase() === name.toLowerCase()))
        return { ok: false, error: "You already have a split with this name" }

      let saved: Split
      if (draft.sourceId) {
        const old = splits.find((s) => s.id === draft.sourceId)
        if (!old) return { ok: false, error: "This split no longer exists" }
        saved = { ...old, name, days: cloneDays(draft.days) }
        set({ splits: splits.map((s) => (s.id === saved.id ? saved : s)), draft: null, dayDraft: null })
      } else {
        saved = { id: crypto.randomUUID(), name, kind: "custom", isActive: splits.length === 0, days: cloneDays(draft.days) }
        set({ splits: [...splits, saved], draft: null, dayDraft: null })
      }
      void enqueue(() => writeSplit(saved))
      return { ok: true, id: saved.id }
    },

    setActive: (id: string) => {
      set((s: State) => ({ splits: s.splits.map((x) => ({ ...x, isActive: x.id === id })) }))
      void enqueue(() => setActiveRow(id))
    },

    duplicate: (id: string) => {
      const list = get().splits
      const src = list.find((x) => x.id === id)
      if (!src) return
      const taken = new Set(list.map((x) => x.name.toLowerCase()))
      let name = `${src.name} copy`
      for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${src.name} copy ${n}`
      const copy: Split = { ...src, id: crypto.randomUUID(), name, kind: "custom", isActive: false, days: cloneDays(src.days) }
      set({ splits: [...list, copy] })
      void enqueue(() => writeSplit(copy))
    },

    remove: (id: string) => {
      set((s: State) => ({ splits: s.splits.filter((x) => x.id !== id) }))
      void enqueue(() => deleteSplitRow(id))
    },

    // the database already removes it from days (cascade); this keeps the screens in step
    purgeWorkout: (workoutId: string) =>
      set((s: State) => ({
        splits: s.splits.map((sp) => ({
          ...sp,
          days: sp.days.map((d) =>
            d.workoutIds.includes(workoutId) ? { ...d, workoutIds: d.workoutIds.filter((x) => x !== workoutId) } : d
          ),
        })),
      })),

    startDay: (dow: number) => {
      const d = get().draft?.days[dow]
      if (d) set({ dayDraft: { dow, day: cloneDays([d])[0] } })
    },
    patchDay: (p: Partial<DayPlan>) => patchDayDraft((d) => ({ ...d, ...p })),
    toggleMuscle: (m: Muscle) =>
      patchDayDraft((d) => ({ ...d, muscles: d.muscles.includes(m) ? d.muscles.filter((x) => x !== m) : [...d.muscles, m] })),
    addWorkouts: (ids: string[]) =>
      patchDayDraft((d) => {
        const have = new Set(d.workoutIds)
        return { ...d, workoutIds: [...d.workoutIds, ...ids.filter((i: string) => !have.has(i))] }
      }),
    moveWorkout: (index: number, dir: -1 | 1) =>
      patchDayDraft((d) => {
        const list = [...d.workoutIds]
        const j = index + dir
        if (j < 0 || j >= list.length) return d
        ;[list[index], list[j]] = [list[j], list[index]]
        return { ...d, workoutIds: list }
      }),
    removeWorkout: (index: number) =>
      patchDayDraft((d) => ({ ...d, workoutIds: d.workoutIds.filter((_, i) => i !== index) })),

    commitDay: () =>
      set((s: State) => {
        if (!s.draft || !s.dayDraft) return s
        const { dow, day } = s.dayDraft
        const days = s.draft.days.map((x, i) => (i === dow ? { ...cloneDays([day])[0], label: day.label.trim() } : x))
        return { draft: { ...s.draft, days }, dayDraft: null }
      }),
    discardDay: () => set({ dayDraft: null }),
  }
})