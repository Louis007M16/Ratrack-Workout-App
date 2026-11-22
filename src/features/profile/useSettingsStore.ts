import { create } from "zustand"
import type { Unit } from "@/lib/units"

export const useSettingsStore = create<{ defaultUnit: Unit; name: string }>()(() => ({
  defaultUnit: "kg",
  name: "",
}))