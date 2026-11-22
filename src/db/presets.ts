import { sql, transaction } from "./client"
import { getSetting, setSetting } from "./settings"

const FLAG = "presets_installed"
const LB = 0.45359237 // kg per lb

type Unit = "kg" | "lbs"
type Stage = [weight: number, reps: number]
type PSet = { type: "normal" | "drop"; weight: number; reps: number; drops?: Stage[] }

const n = (weight: number, reps: number): PSet => ({ type: "normal", weight, reps })
const drop = (...stages: Stage[]): PSet => ({
  type: "drop", weight: stages[0][0], reps: stages[0][1], drops: stages.slice(1),
})

type PWorkout = { id: string; name: string; muscle: string; unit: Unit; step: number; sets: PSet[] }

const WORKOUTS: PWorkout[] = [
  // Push
  { id: "p-incline-db", name: "Incline Dumbbell Press", muscle: "Chest", unit: "kg", step: 2.5, sets: [n(25, 12), n(25, 12), n(27.5, 8)] },
  { id: "p-pec-deck", name: "Pec Deck Machine", muscle: "Chest", unit: "lbs", step: 5, sets: [n(100, 12), n(100, 12), n(115, 8)] },
  { id: "p-shoulder-press", name: "Shoulder Press", muscle: "Shoulder", unit: "kg", step: 2.5, sets: [n(20, 12), n(20, 12), n(22.5, 10)] },
  { id: "p-lateral-raise", name: "Lateral Raise", muscle: "Shoulder", unit: "kg", step: 1, sets: [drop([7.5, 8], [5, 12], [3, 15]), drop([7.5, 8], [5, 12], [3, 15])] },
  { id: "p-rear-delt-fly", name: "Rear Delt Fly", muscle: "Shoulder", unit: "kg", step: 1, sets: [drop([5, 12], [3, 15]), drop([5, 12], [3, 15])] },
  { id: "p-triceps-pushdown", name: "Triceps Cable Pushdown", muscle: "Tricep", unit: "lbs", step: 5, sets: [n(70, 12), n(70, 12), n(80, 8)] },
  { id: "p-overhead-ext", name: "Overhead Extension", muscle: "Tricep", unit: "lbs", step: 5, sets: [n(50, 12), n(50, 12), n(60, 10)] },
  // Pull
  { id: "p-lat-pulldown", name: "Lat Pulldown", muscle: "Back", unit: "kg", step: 2.5, sets: [n(70, 10), n(70, 10), n(80, 8)] },
  { id: "p-seated-row", name: "Seated Cable Row", muscle: "Back", unit: "lbs", step: 5, sets: [n(70, 12), n(70, 12), n(80, 8)] },
  { id: "p-tbar-row", name: "T-bar Row", muscle: "Back", unit: "kg", step: 2.5, sets: [n(90, 12), n(90, 12), n(95, 10)] },
  { id: "p-preacher-curl", name: "Preacher Curls", muscle: "Bicep", unit: "lbs", step: 2.5, sets: [n(12, 12), n(12, 12), n(15, 15)] },
  { id: "p-hammer-curl", name: "Hammer Curls", muscle: "Bicep", unit: "lbs", step: 5, sets: [n(30, 12), n(30, 12)] },
  // Legs
  { id: "p-smith-squat", name: "Smith Machine Squat", muscle: "Quads", unit: "kg", step: 2.5, sets: [n(20, 12), n(20, 12), n(20, 12)] },
  { id: "p-leg-extension", name: "Seated Leg Extension", muscle: "Quads", unit: "lbs", step: 5, sets: [n(40, 12), n(40, 12), n(40, 12)] },
  { id: "p-rdl", name: "Romanian Deadlift (RDL)", muscle: "Hamstring", unit: "kg", step: 2.5, sets: [n(20, 12), n(20, 12), n(20, 12)] },
  // reps were blank in the list, so 12 is a placeholder
  { id: "p-leg-curl", name: "Seated Leg Curl", muscle: "Hamstring", unit: "lbs", step: 5, sets: [n(35, 12), n(35, 12), n(35, 12)] },
  { id: "p-calf-raise", name: "Standing Calf Raise Machine", muscle: "Calves", unit: "lbs", step: 5, sets: [n(60, 8), n(60, 8), n(60, 8)] },
]

const PUSH = ["p-incline-db", "p-pec-deck", "p-shoulder-press", "p-lateral-raise", "p-rear-delt-fly", "p-triceps-pushdown", "p-overhead-ext"]
const PULL = ["p-lat-pulldown", "p-seated-row", "p-tbar-row", "p-preacher-curl", "p-hammer-curl"]
const LEGS = ["p-smith-squat", "p-leg-extension", "p-rdl", "p-leg-curl", "p-calf-raise"]

type PDay = [label: string, isRest: boolean, muscles: string[], workoutIds: string[]]
const push: PDay = ["Push Day", false, ["Chest", "Shoulder", "Tricep"], PUSH]
const pull: PDay = ["Pull Day", false, ["Back", "Bicep"], PULL]
const legs: PDay = ["Leg Day", false, ["Quads", "Hamstring", "Calves"], LEGS]
const rest: PDay = ["Rest Day", true, [], []]

const SPLIT = { id: "p-ppl", name: "PPL (Push Pull Legs)", days: [push, pull, legs, rest, push, pull, legs] }

// runs once, only on a brand-new empty install
export async function installPresetsOnce() {
  if (await getSetting(FLAG)) return

  const rows = (await sql`SELECT (SELECT COUNT(*) FROM workout) + (SELECT COUNT(*) FROM split) AS n`) as { n: number }[]
  if (rows[0].n === 0) {
    await transaction(async (tx) => {
      for (const w of WORKOUTS) {
        const f = w.unit === "lbs" ? LB : 1 // everything is stored in kg
        await tx.sql`INSERT INTO workout (id, name, muscle_group, weight_unit, overload_on, weight_step_kg)
          VALUES (${w.id}, ${w.name}, ${w.muscle}, ${w.unit}, 1, ${w.step * f})`
        for (const [i, s] of w.sets.entries()) {
          await tx.sql`INSERT INTO workout_set (workout_id, position, set_type, weight_kg, reps)
            VALUES (${w.id}, ${i + 1}, ${s.type}, ${s.weight * f}, ${s.reps})`
          for (const [j, d] of (s.drops ?? []).entries()) {
            await tx.sql`INSERT INTO workout_set_drop (workout_id, position, stage, weight_kg, reps)
              VALUES (${w.id}, ${i + 1}, ${j + 1}, ${d[0] * f}, ${d[1]})`
          }
        }
      }

      await tx.sql`INSERT INTO split (id, name, kind, is_active) VALUES (${SPLIT.id}, ${SPLIT.name}, 'preset', 1)`
      for (const [dow, [label, isRest, muscles, ids]] of SPLIT.days.entries()) {
        await tx.sql`INSERT INTO split_day (split_id, day_of_week, label, is_rest)
          VALUES (${SPLIT.id}, ${dow}, ${label}, ${isRest ? 1 : 0})`
        for (const m of muscles) {
          await tx.sql`INSERT INTO split_day_muscle (split_id, day_of_week, muscle) VALUES (${SPLIT.id}, ${dow}, ${m})`
        }
        for (const [i, wid] of ids.entries()) {
          await tx.sql`INSERT INTO split_day_workout (split_id, day_of_week, position, workout_id)
            VALUES (${SPLIT.id}, ${dow}, ${i + 1}, ${wid})`
        }
      }
    })
  }
  await setSetting(FLAG, "1")
}