import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import KebabMenu from "@/components/shared/KebabMenu"
import { fromKg, roundWeight, toKg, type Unit } from "@/lib/units"
import { SET_TYPES, setLabels, type SetType } from "@/lib/sets"
import { cleanDecimal, cleanInt, validateSet, type SetErrors } from "@/lib/validation"
import { cn } from "@/lib/utils"
import { useWorkoutStore } from "./useWorkoutStore"
import type { Stage, Workout } from "@/types/workout"

type Field = "weight" | "reps"
type StageRow = { id: string; weight: string; reps: string }
type Row = StageRow & { type: SetType; drops: StageRow[] }

const uid = () => crypto.randomUUID()
const blankStage = (): StageRow => ({ id: uid(), weight: "", reps: "" })
const shown = (kg: number | null, unit: Unit) => (kg == null ? "" : String(roundWeight(fromKg(kg, unit))))
const stageRow = (s: Stage, unit: Unit): StageRow => ({
  id: uid(), weight: shown(s.weightKg, unit), reps: s.reps == null ? "" : String(s.reps),
})
const toRows = (w: Workout): Row[] =>
  w.sets.map((s) => ({ ...stageRow(s, w.unit), type: s.type, drops: s.drops.map((d) => stageRow(d, w.unit)) }))

const withField = <T extends StageRow>(x: T, field: Field, v: string): T =>
  field === "weight" ? { ...x, weight: v } : { ...x, reps: v }

const num = (v: string) => (v.trim() === "" ? null : Number(v))

function Inputs(p: {
  stage: StageRow
  unit: Unit
  label: string
  error?: SetErrors
  onChange: (field: Field, value: string) => void
}) {
  const { stage: s, error: e } = p
  return (
    <>
      <Input id={`${s.id}-weight`} inputMode="decimal" autoComplete="off" placeholder={`Weight (${p.unit})`}
        aria-label={`Set ${p.label} weight`} aria-invalid={!!e?.weight}
        className={cn(e?.weight && "border-destructive focus-visible:ring-destructive/40")}
        value={s.weight} onChange={(ev) => p.onChange("weight", ev.target.value)} />
      <Input id={`${s.id}-reps`} inputMode="numeric" autoComplete="off" placeholder="Reps"
        aria-label={`Set ${p.label} reps`} aria-invalid={!!e?.reps}
        className={cn(e?.reps && "border-destructive focus-visible:ring-destructive/40")}
        value={s.reps} onChange={(ev) => p.onChange("reps", ev.target.value)} />
    </>
  )
}

function Errs({ e }: { e?: SetErrors }) {
  if (!e || (!e.weight && !e.reps)) return null
  return (
    <div role="alert" className="mt-1 flex gap-2 pl-10 text-xs text-destructive">
      <p className="flex-1">{e.weight}</p>
      <p className="flex-1">{e.reps}</p>
    </div>
  )
}

type Props = { workout: Workout; onDone: () => void }

export default function SetEditorPanel({ workout, onDone }: Props) {
  const updateSets = useWorkoutStore((s) => s.updateSets)
  const [unit, setUnit] = useState<Unit>(workout.unit)
  const [rows, setRows] = useState<Row[]>(() => toRows(workout))
  const [errors, setErrors] = useState<Record<string, SetErrors>>({})
  const [picking, setPicking] = useState(false)

  const labels = setLabels(rows)

  const clearError = (id: string, field: Field) =>
    setErrors((e) => (e[id]?.[field] ? { ...e, [id]: { ...e[id], [field]: undefined } } : e))
  const clean = (field: Field, v: string) => (field === "weight" ? cleanDecimal(v) : cleanInt(v))

  const editMain = (rowId: string, field: Field, value: string) => {
    setRows((rs) => rs.map((r) => (r.id === rowId ? withField(r, field, clean(field, value)) : r)))
    clearError(rowId, field)
  }
  const editDrop = (rowId: string, stageId: string, field: Field, value: string) => {
    setRows((rs) =>
      rs.map((r) =>
        r.id === rowId
          ? { ...r, drops: r.drops.map((d) => (d.id === stageId ? withField(d, field, clean(field, value)) : d)) }
          : r
      )
    )
    clearError(stageId, field)
  }

  const changeUnit = (next: Unit) => {
    const conv = (v: string) => {
      const n = num(v)
      return n == null || Number.isNaN(n) ? v : String(roundWeight(fromKg(toKg(n, unit), next)))
    }
    setRows((rs) => rs.map((r) => ({ ...r, weight: conv(r.weight), drops: r.drops.map((d) => ({ ...d, weight: conv(d.weight) })) })))
    setErrors({})
    setUnit(next)
  }

  const addSet = (type: SetType) => {
    const row: Row = { ...blankStage(), type, drops: type === "drop" ? [blankStage()] : [] }
    setRows((rs) => (type === "warmup" ? [row, ...rs] : [...rs, row]))
    setPicking(false)
  }
  const changeType = (id: string, type: SetType) =>
    setRows((rs) =>
      rs.map((r) =>
        r.id === id ? { ...r, type, drops: type === "drop" ? (r.drops.length ? r.drops : [blankStage()]) : [] } : r
      )
    )
  const addStage = (id: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, drops: [...r.drops, blankStage()] } : r)))
  const removeStage = (rowId: string, stageId: string) =>
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, drops: r.drops.filter((d) => d.id !== stageId) } : r)))
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id))

  const apply = () => {
    const found: Record<string, SetErrors> = {}
    const check = (s: StageRow) => {
      const e = validateSet(s.weight, s.reps, unit)
      if (e.weight || e.reps) found[s.id] = e
    }
    for (const r of rows) {
      check(r)
      r.drops.forEach(check)
    }
    setErrors(found)

    const bad = rows.flatMap((r) => [r as StageRow, ...r.drops]).find((x) => found[x.id])
    if (bad) {
      document.getElementById(`${bad.id}-${found[bad.id].weight ? "weight" : "reps"}`)?.focus()
      return
    }

    const stage = (s: StageRow): Stage => {
      const w = num(s.weight)
      const reps = num(s.reps)
      return { weightKg: w == null ? null : toKg(w, unit), reps: reps == null ? null : Math.round(reps) }
    }
    updateSets(
      workout.id,
      unit,
      rows.map((r) => ({ type: r.type, ...stage(r), drops: r.drops.map(stage) }))
    )
    onDone()
  }

  return (
    <div className="px-4 pb-4">
      <div role="group" aria-label="Weight unit" className="inline-flex rounded-full bg-secondary p-1">
        {(["kg", "lbs"] as const).map((u) => (
          <button key={u} type="button" aria-pressed={unit === u} onClick={() => changeUnit(u)}
            className={cn("rounded-full px-4 py-1 text-sm",
              unit === u ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground")}>
            {u === "kg" ? "Kg" : "Lbs"}
          </button>
        ))}
      </div>

      <div className="mt-1 divide-y divide-border">
        {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No sets yet. Tap + Add Set.</p>}
        {rows.map((r, i) => (
          <div key={r.id} className="py-2.5">
            <div className="flex items-center gap-2">
              <span className={cn("w-8 shrink-0 text-center text-2xl font-semibold", r.type !== "normal" && "text-primary")}>
                {labels[i]}
              </span>
              <Inputs stage={r} unit={unit} label={labels[i]} error={errors[r.id]}
                onChange={(f, v) => editMain(r.id, f, v)} />
              <KebabMenu
                label={`Options for set ${labels[i]}`}
                items={[
                  ...SET_TYPES.filter((t) => t.type !== r.type).map((t) => ({
                    label: `Make ${t.label}`,
                    onSelect: () => changeType(r.id, t.type),
                  })),
                  ...(r.type === "drop" ? [{ label: "Add drop", onSelect: () => addStage(r.id) }] : []),
                  { label: "Remove set", destructive: true, onSelect: () => removeRow(r.id) },
                ]}
              />
            </div>
            <Errs e={errors[r.id]} />

            {r.drops.map((d) => (
              <div key={d.id}>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-8 shrink-0 text-center text-muted-foreground" aria-hidden="true">↳</span>
                  <Inputs stage={d} unit={unit} label={`${labels[i]} drop`} error={errors[d.id]}
                    onChange={(f, v) => editDrop(r.id, d.id, f, v)} />
                  <button type="button" aria-label="Remove this drop" onClick={() => removeStage(r.id, d.id)}
                    className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary">
                    ×
                  </button>
                </div>
                <Errs e={errors[d.id]} />
              </div>
            ))}

            {r.type === "drop" && (
              <button type="button" onClick={() => addStage(r.id)} className="ml-10 mt-2 text-xs font-semibold text-gold">
                + Add drop
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-3">
        <Button variant="secondary" size="lg" onClick={apply}>Apply</Button>
        <Button size="lg" onClick={() => setPicking(true)}>+ Add Set</Button>
      </div>

      <Drawer open={picking} onOpenChange={setPicking}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="px-5 pb-2 pt-3">
            <DrawerTitle className="text-center text-lg">Select Set</DrawerTitle>
          </DrawerHeader>
          <ul className="mx-5 mb-8 divide-y divide-border rounded-2xl border border-border bg-card">
            {SET_TYPES.map((t) => (
              <li key={t.type}>
                <button type="button" onClick={() => addSet(t.type)}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left">
                  <span className="w-6 text-center font-bold text-primary">{t.badge}</span>
                  <span>{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>
    </div>
  )
}