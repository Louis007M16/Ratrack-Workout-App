import { useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import FlowHeader from "@/components/shared/FlowHeader"
import Collapse from "@/components/shared/Collapse"
import { DAYS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { isTrainingDay } from "@/types/split"
import { useWorkoutStore } from "@/features/workouts/useWorkoutStore"
import { useSplitStore } from "./useSplitStore"

export default function SplitDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { splits, setActive, duplicate, remove, startDraft, startDay } = useSplitStore()
  const workouts = useWorkoutStore((s) => s.workouts)
  const today = (new Date().getDay() + 6) % 7 // Monday = 0
  const [openDay, setOpenDay] = useState<number | null>(today)
  const [deleting, setDeleting] = useState(false)

  const split = splits.find((s) => s.id === id)
  if (!split) return <Navigate to="/program" replace />

  const trainingDays = split.days.filter(isTrainingDay).length
  const exercises = split.days.reduce((n, d) => n + (d.isRest ? 0 : d.workoutIds.length), 0)

  const editSplit = () => {
    startDraft(split.id, "detail")
    navigate("/program/schedule")
  }
  const editDay = (dow: number) => {
    startDraft(split.id, "detail")
    startDay(dow)
    navigate(`/program/schedule/day/${dow}`)
  }

  return (
    <div>
      <FlowHeader
        title="Split"
        onBack={() => navigate("/program")}
        right={
          <button type="button" onClick={editSplit} className="min-h-11 px-2 text-sm font-semibold text-primary">
            Edit
          </button>
        }
      />

      <div className="flex items-center gap-2">
        <h2 className="truncate text-2xl font-bold">{split.name}</h2>
        {split.isActive && (
          <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            Active
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {trainingDays} {trainingDays === 1 ? "day" : "days"}, {exercises} exercises
      </p>

      <ul className="mt-5 space-y-3">
        {split.days.map((d, i) => {
          const open = openDay === i
          const count = d.isRest ? 0 : d.workoutIds.length
          return (
            <li
              key={i}
              className={cn(
                "rounded-2xl border bg-card transition-colors duration-300 ease-ios",
                i === today ? "border-primary/60" : "border-border"
              )}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenDay(open ? null : i)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{DAYS[i]}</span>
                    {i === today && (
                      <span className="rounded-md bg-gold-dim px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                        Today
                      </span>
                    )}
                  </span>
                  {count > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      {count} {count === 1 ? "workout" : "workouts"}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs",
                    d.label
                      ? d.isRest
                        ? "border-border text-muted-foreground"
                        : "border-primary/50 bg-gold-dim text-gold"
                      : "border-dashed border-border text-muted-foreground"
                  )}
                >
                  {d.label || "Not set"}
                </span>
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-ios",
                    open && "rotate-90"
                  )}
                  aria-hidden="true"
                />
              </button>

              <Collapse open={open}>
                <div className="px-4 pb-4">
                  {d.isRest ? (
                    <p className="py-3 text-sm text-muted-foreground">Rest day. No workouts.</p>
                  ) : (
                    <>
                      {d.muscles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pb-2">
                          {d.muscles.map((m) => (
                            <span key={m} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                      {d.workoutIds.length === 0 ? (
                        <p className="py-3 text-sm text-muted-foreground">No workouts yet.</p>
                      ) : (
                        <ul className="divide-y divide-border border-t border-border">
                          {d.workoutIds.map((wid, n) => {
                            const w = workouts.find((x) => x.id === wid)
                            return (
                              <li key={wid} className="flex items-center gap-3 py-3">
                                <span className="w-6 text-sm font-semibold text-primary">
                                  {String(n + 1).padStart(2, "0")}
                                </span>
                                <div className="min-w-0">
                                  <p className={cn("truncate font-medium", !w && "text-muted-foreground")}>
                                    {w ? w.name : "Deleted workout"}
                                  </p>
                                  {w && (
                                    <p className="text-xs text-muted-foreground">
                                      {w.muscle}
                                      {w.sets.length ? `, ${w.sets.length} sets` : ""}
                                    </p>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </>
                  )}
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => editDay(i)}>
                    Edit day
                  </Button>
                </div>
              </Collapse>
            </li>
          )
        })}
      </ul>

      <div className="mt-6 grid gap-3">
        {!split.isActive && (
          <Button size="lg" onClick={() => setActive(split.id)}>Set as Active</Button>
        )}
        <div className={cn("grid gap-3", !split.isActive ? "grid-cols-2" : "grid-cols-1")}>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => { duplicate(split.id); navigate("/program") }}
          >
            Duplicate
          </Button>
          {!split.isActive && (
            <Button variant="destructive" size="lg" onClick={() => setDeleting(true)}>Delete</Button>
          )}
        </div>
        {split.isActive && (
          <p className="text-center text-xs text-muted-foreground">
            Set another split as active to delete this one.
          </p>
        )}
      </div>

      <Drawer open={deleting} onOpenChange={setDeleting}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="px-5 pb-1 pt-3 text-left">
            <DrawerTitle>Delete {split.name}?</DrawerTitle>
          </DrawerHeader>
          <p className="px-5 text-sm text-muted-foreground">Your logged workouts stay in your history.</p>
          <div className="grid grid-cols-2 gap-3 px-5 pb-8 pt-5">
            <Button variant="secondary" size="lg" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => { remove(split.id); navigate("/program", { replace: true }) }}
            >
              Delete
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}