import type { Muscle } from "@/lib/constants"

export type DayPlan = {
  label: string
  isRest: boolean
  muscles: Muscle[]
  workoutIds: string[]
}

export type Split = {
  id: string
  name: string
  kind: "preset" | "custom"
  isActive: boolean
  days: DayPlan[] // always 7 entries, Monday first
}

export const emptyDay = (): DayPlan => ({ label: "", isRest: false, muscles: [], workoutIds: [] })

export const isTrainingDay = (d: DayPlan) =>
  !d.isRest && (d.workoutIds.length > 0 || d.label.trim() !== "")