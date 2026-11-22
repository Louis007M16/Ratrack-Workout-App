import { useCallback, useEffect, useState } from "react"
import { initDb } from "@/db/init"
import { getSetting, setSetting } from "@/db/settings"
import type { Unit } from "@/lib/units"
import { useSettingsStore } from "./useSettingsStore"

export function useProfile() {
  const [ready, setReady] = useState(false)
  const [name, setNameState] = useState("")
  const [unit, setUnitState] = useState<Unit>("kg")
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    await initDb()
    setNameState((await getSetting("profile_name")) ?? "")
    setUnitState(((await getSetting("default_unit")) as Unit | null) ?? "kg")
    setLastBackup(await getSetting("last_backup_at"))
    setReady(true)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const saveName = async (v: string) => { await setSetting("profile_name", v); setNameState(v); useSettingsStore.setState({ name: v }) }
  const saveUnit = async (u: Unit) => { await setSetting("default_unit", u); setUnitState(u); useSettingsStore.setState({ defaultUnit: u }) }
  const markBackup = async () => {
    const now = new Date().toISOString()
    await setSetting("last_backup_at", now)
    setLastBackup(now)
  }

  return { ready, name, unit, lastBackup, saveName, saveUnit, markBackup, refresh }
}