import type { Muscle } from "@/lib/constants"
import type { Unit } from "@/lib/units"
import type { SetType } from "@/lib/sets"

export type Stage = { weightKg: number | null; reps: number | null }

export type Overload = { on: boolean; stepKg: number }
export const DEFAULT_OVERLOAD: Overload = { on: true, stepKg: 2.5 }

export type PlannedSet = {
  type: SetType
  weightKg: number | null
  reps: number | null
  drops: Stage[]
}

export type Workout = {
  id: string
  name: string
  muscle: Muscle
  unit: Unit
  sets: PlannedSet[]
  overload: Overload
}