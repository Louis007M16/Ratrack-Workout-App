import { fromKg, type Unit } from "@/lib/units"

export const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })

export const monthLabel = (key: string) =>
  new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" })

export const monthTitle = (key: string) =>
  new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })

export function lastMonths(n: number): string[] {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
}

export const prevMonth = (key: string) => {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export const fmtVolume = (kg: number, unit: Unit) => `${Math.round(fromKg(kg, unit)).toLocaleString()} ${unit}`

export const chart = {
  tick: { fill: "var(--text-muted)", fontSize: 11 },
  tooltip: {
    contentStyle: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--text)", fontSize: 12 },
    labelStyle: { color: "var(--text-muted)" },
  },
}