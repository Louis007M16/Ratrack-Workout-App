export const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

// Monday = 0
export const mondayIndex = (d: Date) => (d.getDay() + 6) % 7

export function currentWeek(today = new Date()): Date[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayIndex(today))
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}