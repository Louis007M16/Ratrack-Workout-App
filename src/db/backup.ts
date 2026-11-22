import { z } from "zod"
import { sql, transaction } from "./client"
import { MIGRATIONS } from "./schema"
import { flushWrites } from "./queue"
import { setSetting } from "./settings"

// allow-list of columns per table. Parents come first so inserts satisfy foreign keys.
const TABLES = {
  workout: ["id", "name", "muscle_group", "weight_unit", "overload_on", "weight_step_kg", "deleted_at", "created_at"],
  workout_set: ["workout_id", "position", "set_type", "weight_kg", "reps"],
  workout_set_drop: ["workout_id", "position", "stage", "weight_kg", "reps"],
  split: ["id", "name", "kind", "is_active", "deleted_at", "created_at"],
  split_day: ["split_id", "day_of_week", "label", "is_rest"],
  split_day_muscle: ["split_id", "day_of_week", "muscle"],
  split_day_workout: ["split_id", "day_of_week", "position", "workout_id"],
  session: ["id", "session_date", "split_id", "day_label", "started_at", "finished_at"],
  set_log: ["id", "session_id", "workout_id", "workout_name", "position", "set_type", "weight_kg", "reps", "is_done", "done_at"],
  set_log_drop: ["set_log_id", "stage", "weight_kg", "reps"],
  app_setting: ["key", "value"],
} as const

type TableName = keyof typeof TABLES
const ORDER = Object.keys(TABLES) as TableName[]

const cell = z.union([z.string(), z.number(), z.null()])
const fileSchema = z.object({
  app: z.literal("ratrack"),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), cell))),
})
export type BackupFile = z.infer<typeof fileSchema>

export type Summary = { workouts: number; splits: number; sessions: number; sets: number }
export type Parsed = { ok: true; file: BackupFile; summary: Summary } | { ok: false; error: string }

export async function exportAll(): Promise<BackupFile> {
  await flushWrites()
  const tables: BackupFile["tables"] = {}
  for (const t of ORDER) {
    tables[t] = (await sql(`SELECT ${TABLES[t].join(", ")} FROM ${t}`)) as Record<string, string | number | null>[]
  }
  return { app: "ratrack", schemaVersion: MIGRATIONS.length, exportedAt: new Date().toISOString(), tables }
}

export function downloadBackup(file: BackupFile) {
  const blob = new Blob([JSON.stringify(file)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `ratrack-backup-${file.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseBackup(text: string): Parsed {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: "This file isn't a valid backup." }
  }
  const res = fileSchema.safeParse(raw)
  if (!res.success) return { ok: false, error: "This file isn't a RATRACK backup." }
  const file = res.data
  if (file.schemaVersion > MIGRATIONS.length) {
    return { ok: false, error: "This backup was made by a newer version of the app. Update the app first." }
  }
  for (const t of ORDER) {
    const allowed = new Set<string>(TABLES[t])
    for (const row of file.tables[t] ?? []) {
      if (Object.keys(row).some((c) => !allowed.has(c))) {
        return { ok: false, error: `The backup has unexpected data in "${t}".` }
      }
    }
  }
  const n = (t: TableName) => file.tables[t]?.length ?? 0
  return {
    ok: true,
    file,
    summary: { workouts: n("workout"), splits: n("split"), sessions: n("session"), sets: n("set_log") },
  }
}

// replaces EVERYTHING on this device. Runs in one transaction: if anything fails, nothing changes.
export async function importAll(file: BackupFile) {
  await flushWrites()
  await transaction(async (tx) => {
    for (const t of [...ORDER].reverse()) await tx.sql(`DELETE FROM ${t}`)
    for (const t of ORDER) {
      for (const row of file.tables[t] ?? []) {
        const cols = Object.keys(row)
        if (cols.length === 0) continue
        await tx.sql(
          `INSERT INTO ${t} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
          ...cols.map((c) => row[c])
        )
      }
    }
  })
  await setSetting("last_backup_at", file.exportedAt)
  await setSetting("presets_installed", "1")
}

export async function eraseEverything() {
  await flushWrites()
  await transaction(async (tx) => {
    for (const t of [...ORDER].reverse()) await tx.sql(`DELETE FROM ${t}`)
  })
  await setSetting("presets_installed", "1")
}