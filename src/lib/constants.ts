export const MUSCLES = [
  "Chest", "Back", "Shoulder", "Bicep", "Tricep",
  "Hamstring", "Glutes", "Quads", "Calves", "Forearms", "Core",
] as const

export type Muscle = (typeof MUSCLES)[number]

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const
export const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const