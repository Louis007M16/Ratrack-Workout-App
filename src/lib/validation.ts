import { toKg, type Unit } from "@/lib/units"

export const MAX_WEIGHT_KG = 1000
export const MAX_REPS = 100

// while typing: keep only digits and one dot, max 2 decimals
export function cleanDecimal(v: string) {
  let s = v.replace(",", ".").replace(/[^\d.]/g, "")
  const i = s.indexOf(".")
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "")
  return s.replace(/^(\d*\.\d{0,2}).*$/, "$1").slice(0, 7)
}

// while typing: digits only
export const cleanInt = (v: string) => v.replace(/\D/g, "").slice(0, 3)

export type SetErrors = { weight?: string; reps?: string }

// on Apply. Empty is allowed (sets are optional), but anything typed must be valid.
export function validateSet(weight: string, reps: string, unit: Unit): SetErrors {
  const errors: SetErrors = {}

  if (weight.trim() !== "") {
    const w = Number(weight)
    if (!Number.isFinite(w)) errors.weight = "Enter a valid number"
    else if (w < 0) errors.weight = "Can't be negative"
    else if (toKg(w, unit) > MAX_WEIGHT_KG) errors.weight = "That looks too heavy"
  }

  if (reps.trim() !== "") {
    const r = Number(reps)
    if (!Number.isInteger(r)) errors.reps = "Use a whole number"
    else if (r < 1) errors.reps = "At least 1 rep"
    else if (r > MAX_REPS) errors.reps = `Max ${MAX_REPS} reps`
  }

  return errors
}