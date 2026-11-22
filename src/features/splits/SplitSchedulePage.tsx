import { useState } from "react"
import { Navigate, useNavigate } from "react-router"
import { ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import FlowHeader from "@/components/shared/FlowHeader"
import { DAYS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useSplitStore } from "./useSplitStore"

export default function SplitSchedulePage() {
  const navigate = useNavigate()
  const { draft, setDraftName, discardDraft, saveDraft, startDay } = useSplitStore()
  const [error, setError] = useState("")

  if (!draft) return <Navigate to="/program" replace />

  const target = (id: string | null) => (draft.origin === "detail" && id ? `/program/${id}` : "/program")

  const back = () => {
    const dest = target(draft.sourceId)
    discardDraft()
    navigate(dest)
  }
  const save = () => {
    const origin = draft.origin
    const res = saveDraft()
    if (!res.ok) { setError(res.error); return }
        navigate(origin === "detail" || draft.sourceId ? `/program/${res.id}` : "/program")
  }
  const openDay = (i: number) => { startDay(i); navigate(`/program/schedule/day/${i}`) }

  return (
    <div>
      <FlowHeader title="New Split Schedule" onBack={back}
        right={<button type="button" onClick={save} className="min-h-11 px-2 text-sm font-semibold text-primary">Save</button>} />

      <label htmlFor="split-name" className="text-sm text-muted-foreground">Week Program Name</label>
      <Input id="split-name" className="mt-2" placeholder="Week Program Name" maxLength={40}
        value={draft.name} aria-invalid={!!error}
        onChange={(e) => { setDraftName(e.target.value); setError("") }} />
      {error && <p role="alert" className="mt-1.5 text-sm text-destructive">{error}</p>}

      <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
        {DAYS.map((name, i) => {
          const d = draft.days[i]
          const count = d.isRest ? 0 : d.workoutIds.length
          return (
            <li key={name}>
              <button type="button" onClick={() => openDay(i)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-secondary/60">
                <span className="flex-1 font-medium">{name}</span>
                {count > 0 && <span className="text-xs text-muted-foreground">{count} {count === 1 ? "workout" : "workouts"}</span>}
                <span className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs",
                  d.label ? (d.isRest ? "border-border text-muted-foreground" : "border-primary/50 bg-gold-dim text-gold")
                          : "border-dashed border-border text-muted-foreground"
                )}>
                  {d.label || "Add"}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}