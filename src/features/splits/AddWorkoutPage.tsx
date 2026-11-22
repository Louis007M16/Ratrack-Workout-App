import { useMemo, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FlowHeader from "@/components/shared/FlowHeader"
import Chips from "@/components/shared/Chips"
import { DAYS, MUSCLES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useWorkoutStore } from "@/features/workouts/useWorkoutStore"
import { useSplitStore } from "./useSplitStore"
import { fmtWeight } from "@/lib/units"
import { useLogStore } from "@/features/session/useLogStore"

export default function AddWorkoutPage() {
  const navigate = useNavigate()
  const dow = Number(useParams().dow)
  const dayDraft = useSplitStore((s) => s.dayDraft)
  const addWorkouts = useSplitStore((s) => s.addWorkouts)
  const workouts = useWorkoutStore((s) => s.workouts)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const [sel, setSel] = useState<string[]>([])
  const prs = useLogStore((s) => s.prs)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const shown = workouts.filter((w) => (filter === "All" || w.muscle === filter) && w.name.toLowerCase().includes(q))
    return MUSCLES.map((m) => ({ muscle: m, items: shown.filter((w) => w.muscle === m) })).filter((g) => g.items.length)
  }, [workouts, query, filter])

  if (!dayDraft || dayDraft.dow !== dow || !DAYS[dow]) return <Navigate to="/program" replace />

  const back = `/program/schedule/day/${dow}`
  const already = new Set(dayDraft.day.workoutIds)
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const confirm = () => { addWorkouts(sel); navigate(back) }

  return (
    <div className="pb-28">
      <FlowHeader title="Add Workout" onBack={() => navigate(back)}
        right={<span className="text-sm text-primary" aria-live="polite">{sel.length} selected</span>} />

      <p className="text-sm text-muted-foreground">Adding to <span className="font-semibold text-foreground">{DAYS[dow]}</span></p>
      <Input className="mt-3" type="search" placeholder="Search Workout" aria-label="Search workout"
        value={query} onChange={(e) => setQuery(e.target.value)} />
      <Chips items={["All", ...MUSCLES]} value={filter} onChange={setFilter}
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" />

      {groups.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">No workouts found.</p>
      ) : (
        groups.map((g) => (
          <section key={g.muscle} className="mt-5">
            <div className="mb-1 flex items-center justify-between px-1">
              <h2 className="font-bold">{g.muscle}</h2>
              <span className="text-xs text-muted-foreground">{g.items.length}</span>
            </div>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {g.items.map((w) => {
                const added = already.has(w.id)
                const on = sel.includes(w.id)
                return (
                  <li key={w.id}>
                    <button type="button" disabled={added} aria-pressed={on || added} onClick={() => toggle(w.id)}
                      className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-secondary/60", added && "opacity-50")}>
                      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                        on || added ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>
                        {(on || added) && <Check className="size-4" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{w.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {added
                            ? "Already added"
                            : w.sets.length === 0
                              ? "No sets yet"
                              : `${w.sets.length} ${w.sets.length === 1 ? "set" : "sets"} | ${
                                  prs[w.id]
                                    ? `PR: ${fmtWeight(prs[w.id].weightKg, w.unit)} • ${prs[w.id].reps} reps`
                                    : "No PR yet"
                                }`}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-md">
          <Button size="lg" className="w-full" disabled={sel.length === 0} onClick={confirm}>
            {sel.length ? `Add ${sel.length} ${sel.length === 1 ? "Workout" : "Workouts"}` : "Select workouts"}
          </Button>
        </div>
      </div>
    </div>
  )
}