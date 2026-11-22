import { sql } from "./client"
import { flushWrites } from "./queue"

const DONE = `l.is_done = 1 AND l.weight_kg IS NOT NULL AND l.reps IS NOT NULL`

export type WorkoutSummary = { workoutId: string; sessions: number; bestKg: number; lastDate: string }
export async function loadWorkoutSummaries(): Promise<WorkoutSummary[]> {
  await flushWrites()
  const rows = (await sql(`
    SELECT l.workout_id AS id, COUNT(DISTINCT s.session_date) AS sessions,
           MAX(l.weight_kg) AS best, MAX(s.session_date) AS last
    FROM set_log l JOIN session s ON s.id = l.session_id
    WHERE ${DONE} AND l.set_type = 'normal' AND l.workout_id IS NOT NULL
    GROUP BY l.workout_id`)) as { id: string; sessions: number; best: number; last: string }[]
  return rows.map((r) => ({ workoutId: r.id, sessions: r.sessions, bestKg: r.best, lastDate: r.last }))
}

export type SessionPoint = { date: string; bestKg: number; volumeKg: number; reps: number; sets: number }
export async function loadWorkoutSeries(id: string): Promise<SessionPoint[]> {
  await flushWrites()
  const rows = (await sql`
    SELECT s.session_date AS date, MAX(l.weight_kg) AS best, SUM(l.weight_kg * l.reps) AS volume,
           SUM(l.reps) AS reps, COUNT(*) AS sets
    FROM set_log l JOIN session s ON s.id = l.session_id
    WHERE l.workout_id = ${id} AND l.is_done = 1 AND l.set_type = 'normal'
      AND l.weight_kg IS NOT NULL AND l.reps IS NOT NULL
    GROUP BY s.session_date ORDER BY s.session_date`) as
    { date: string; best: number; volume: number; reps: number; sets: number }[]
  return rows.map((r) => ({ date: r.date, bestKg: r.best, volumeKg: r.volume, reps: r.reps, sets: r.sets }))
}

export type SetRow = { date: string; position: number; type: string; weightKg: number; reps: number }
export async function loadWorkoutSets(id: string): Promise<SetRow[]> {
  await flushWrites()
  const rows = (await sql`
    SELECT s.session_date AS date, l.position AS position, l.set_type AS type, l.weight_kg AS w, l.reps AS r
    FROM set_log l JOIN session s ON s.id = l.session_id
    WHERE l.workout_id = ${id} AND l.is_done = 1 AND l.weight_kg IS NOT NULL AND l.reps IS NOT NULL
    ORDER BY s.session_date DESC, l.position LIMIT 400`) as
    { date: string; position: number; type: string; w: number; r: number }[]
  return rows.map((r) => ({ date: r.date, position: r.position, type: r.type, weightKg: r.w, reps: r.r }))
}

export type MonthStat = { month: string; days: number; sets: number; reps: number; volumeKg: number }
export async function loadMonths(): Promise<MonthStat[]> {
  await flushWrites()
  const rows = (await sql(`
    SELECT strftime('%Y-%m', s.session_date) AS month, COUNT(DISTINCT s.session_date) AS days,
           COUNT(l.id) AS sets, SUM(l.reps) AS reps, SUM(l.weight_kg * l.reps) AS volume
    FROM set_log l JOIN session s ON s.id = l.session_id
    WHERE ${DONE} AND l.set_type <> 'warmup'
    GROUP BY month ORDER BY month DESC`)) as
    { month: string; days: number; sets: number; reps: number; volume: number }[]
  return rows.map((r) => ({ month: r.month, days: r.days, sets: r.sets, reps: r.reps, volumeKg: r.volume }))
}

export type MonthWorkout = { name: string; sets: number; reps: number; bestKg: number }
export async function loadMonthDetail(month: string): Promise<MonthWorkout[]> {
  await flushWrites()
  const rows = (await sql`
    SELECT l.workout_name AS name, COUNT(*) AS sets, SUM(l.reps) AS reps, MAX(l.weight_kg) AS best
    FROM set_log l JOIN session s ON s.id = l.session_id
    WHERE strftime('%Y-%m', s.session_date) = ${month} AND l.is_done = 1
      AND l.set_type <> 'warmup' AND l.weight_kg IS NOT NULL AND l.reps IS NOT NULL
    GROUP BY l.workout_name ORDER BY sets DESC, name`) as
    { name: string; sets: number; reps: number; best: number }[]
  return rows.map((r) => ({ name: r.name, sets: r.sets, reps: r.reps, bestKg: r.best }))
}