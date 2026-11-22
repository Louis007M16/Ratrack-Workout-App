import { sql, transaction } from "./client"
import type { Muscle } from "@/lib/constants"
import { emptyDay, type Split } from "@/types/split"

type SpRow = { id: string; name: string; kind: string; is_active: number }
type DRow = { split_id: string; day_of_week: number; label: string; is_rest: number }
type MRow = { split_id: string; day_of_week: number; muscle: string }
type WRow = { split_id: string; day_of_week: number; workout_id: string }

export async function loadSplits(): Promise<Split[]> {
  const sp = (await sql`SELECT id, name, kind, is_active FROM split WHERE deleted_at IS NULL ORDER BY rowid`) as SpRow[]
  const days = (await sql`SELECT split_id, day_of_week, label, is_rest FROM split_day`) as DRow[]
  const muscles = (await sql`SELECT split_id, day_of_week, muscle FROM split_day_muscle ORDER BY rowid`) as MRow[]
  const works = (await sql`SELECT split_id, day_of_week, workout_id FROM split_day_workout
    ORDER BY split_id, day_of_week, position`) as WRow[]

  return sp.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind === "preset" ? "preset" : "custom",
    isActive: s.is_active === 1,
    days: Array.from({ length: 7 }, (_, dow) => {
      const d = days.find((x) => x.split_id === s.id && x.day_of_week === dow)
      if (!d) return emptyDay()
      return {
        label: d.label,
        isRest: d.is_rest === 1,
        muscles: muscles.filter((m) => m.split_id === s.id && m.day_of_week === dow).map((m) => m.muscle as Muscle),
        workoutIds: works.filter((w) => w.split_id === s.id && w.day_of_week === dow).map((w) => w.workout_id),
      }
    }),
  }))
}

export async function writeSplit(s: Split) {
  await transaction(async (tx) => {
    await tx.sql`INSERT INTO split (id, name, kind, is_active)
      VALUES (${s.id}, ${s.name}, ${s.kind}, ${s.isActive ? 1 : 0})
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind, is_active = excluded.is_active`
    await tx.sql`DELETE FROM split_day WHERE split_id = ${s.id}` // cascades muscles and workouts
    for (const [dow, d] of s.days.entries()) {
      await tx.sql`INSERT INTO split_day (split_id, day_of_week, label, is_rest)
        VALUES (${s.id}, ${dow}, ${d.label}, ${d.isRest ? 1 : 0})`
      for (const m of d.muscles) {
        await tx.sql`INSERT INTO split_day_muscle (split_id, day_of_week, muscle) VALUES (${s.id}, ${dow}, ${m})`
      }
      for (const [i, wid] of d.workoutIds.entries()) {
        await tx.sql`INSERT INTO split_day_workout (split_id, day_of_week, position, workout_id)
          VALUES (${s.id}, ${dow}, ${i + 1}, ${wid})`
      }
    }
  })
}

export async function setActiveRow(id: string) {
  await transaction(async (tx) => {
    await tx.sql`UPDATE split SET is_active = 0 WHERE is_active = 1`
    await tx.sql`UPDATE split SET is_active = 1 WHERE id = ${id}`
  })
}

export async function deleteSplitRow(id: string) {
  await sql`DELETE FROM split WHERE id = ${id}`
}