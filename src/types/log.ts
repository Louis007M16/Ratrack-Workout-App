import type { SetType } from "@/lib/sets"
import type { Stage } from "./workout"

export type LogSet = {
  id: string
  type: SetType
  weightKg: number | null
  reps: number | null
  drops: Stage[]
  done: boolean
}