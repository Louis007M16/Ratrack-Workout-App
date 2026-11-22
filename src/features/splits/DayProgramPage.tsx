import { Navigate, useNavigate, useParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FlowHeader from "@/components/shared/FlowHeader"
import KebabMenu from "@/components/shared/KebabMenu"
import { DAYS, MUSCLES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useWorkoutStore } from "@/features/workouts/useWorkoutStore"
import { useSplitStore } from "./useSplitStore"

export default function DayProgramPage() {
   const navigate = useNavigate()
   const dow = Number(useParams().dow)
   const { dayDraft, patchDay, toggleMuscle, moveWorkout, removeWorkout, commitDay, discardDay } = useSplitStore()
   const workouts = useWorkoutStore((s) => s.workouts)

   if (!dayDraft || dayDraft.dow !== dow || !DAYS[dow]) return <Navigate to="/program" replace />
   const draft = useSplitStore((s) => s.draft)
   const saveDraft = useSplitStore((s) => s.saveDraft)
   const { day } = dayDraft
   const parent = "/program/schedule"

   const fromDetail = draft?.origin === "detail"
   const detailPath = draft?.sourceId ? `/program/${draft.sourceId}` : "/program"

   const back = () => {
      discardDay()
      if (fromDetail) { useSplitStore.getState().discardDraft(); navigate(detailPath) }
      else navigate(parent)
    }
    const save = () => {
      commitDay()
      if (fromDetail) {
        const res = saveDraft()
        navigate(res.ok ? `/program/${res.id}` : parent)
      } else {
        navigate(parent)
      }
    }
  const setRest = (on: boolean) =>
    patchDay(on
      ? { isRest: true, label: day.label.trim() || "Rest Day" }
      : { isRest: false, label: day.label === "Rest Day" ? "" : day.label })

  return (
    <div>
      <FlowHeader title="Day Program" onBack={back}
        right={<button type="button" onClick={save} className="min-h-11 px-2 text-sm font-semibold text-primary">Save</button>} />

      <h2 className="text-3xl font-bold">{DAYS[dow]}</h2>

      <label htmlFor="day-label" className="mt-5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Label</label>
      <Input id="day-label" className="mt-2" maxLength={20} placeholder="e.g. Push Day"
        value={day.label} onChange={(e) => patchDay({ label: e.target.value })} />

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-sm">Rest day</span>
        <button type="button" role="switch" aria-checked={day.isRest} aria-label="Rest day"
          onClick={() => setRest(!day.isRest)}
          className={cn("relative h-7 w-12 rounded-full transition-colors duration-200 ease-ios",
            day.isRest ? "bg-primary" : "bg-secondary")}>
          <span className={cn("absolute left-0.5 top-0.5 size-6 rounded-full bg-foreground transition-transform duration-200 ease-ios",
            day.isRest && "translate-x-5 bg-primary-foreground")} />
        </button>
      </div>

      {day.isRest ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">Rest days have no workouts.</p>
      ) : (
        <>
          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">Muscles</p>
          <p className="mt-1 text-xs text-muted-foreground">Add muscle group for the description of your workout day.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {MUSCLES.map((m) => {
              const on = day.muscles.includes(m)
              return (
                <button key={m} type="button" aria-pressed={on} onClick={() => toggleMuscle(m)}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-[color,background-color,border-color,transform] duration-200 ease-ios active:scale-95",
                    on ? "border-primary bg-primary font-semibold text-primary-foreground"
                       : "border-border bg-secondary text-muted-foreground")}>
                  {m}
                </button>
              )
            })}
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Exercise</h3>
              <Button size="sm" onClick={() => navigate(`${parent}/day/${dow}/add`)}>+ Workout</Button>
            </div>

            {day.workoutIds.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No workouts yet. Tap + Workout.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border border-t border-border">
                {day.workoutIds.map((id, i) => {
                  const w = workouts.find((x) => x.id === id)
                  return (
                    <li key={id} className="flex items-center gap-3 py-3">
                      <span className="w-6 text-sm font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate font-semibold", !w && "text-muted-foreground")}>{w ? w.name : "Deleted workout"}</p>
                        {w && <p className="text-xs text-muted-foreground">{w.muscle}{w.sets.length ? `, ${w.sets.length} sets` : ""}</p>}
                      </div>
                      <KebabMenu label={`Options for ${w?.name ?? "workout"}`} items={[
                        ...(i > 0 ? [{ label: "Move up", onSelect: () => moveWorkout(i, -1) }] : []),
                        ...(i < day.workoutIds.length - 1 ? [{ label: "Move down", onSelect: () => moveWorkout(i, 1) }] : []),
                        { label: "Remove", onSelect: () => removeWorkout(i), destructive: true },
                      ]} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}