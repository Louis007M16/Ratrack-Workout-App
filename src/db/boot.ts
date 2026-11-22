import { initDb } from "./init"
// import { seedIfEmpty } from "./seed"
import { loadWorkouts } from "./workouts"
import { loadSplits } from "./splits"
import { loadLog } from "./log"
import { getSetting } from "./settings"
import { currentWeek, dateKey } from "@/lib/dates"
import { useWorkoutStore } from "@/features/workouts/useWorkoutStore"
import { useSplitStore } from "@/features/splits/useSplitStore"
import { hydrateLog } from "@/features/session/useLogStore"
import { useSettingsStore } from "@/features/profile/useSettingsStore"
import { installPresetsOnce } from "./presets"

export async function bootDb() {
  await initDb()
  await installPresetsOnce()
  // if (import.meta.env.DEV) await seedIfEmpty() // demo data only while developing

  const workouts = await loadWorkouts()
  const splits = await loadSplits()
  const week = currentWeek()
  const log = await loadLog(workouts.map((w) => w.id), dateKey(week[0]), dateKey(week[6]))
  const unit = await getSetting("default_unit")
  const name = await getSetting("profile_name")

  useWorkoutStore.setState({ workouts })
  useSplitStore.setState({ splits })
  hydrateLog(log)
  useSettingsStore.setState({ defaultUnit: unit === "lbs" ? "lbs" : "kg", name: name ?? "" })
}