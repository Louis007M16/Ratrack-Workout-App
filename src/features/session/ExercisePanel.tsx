import { ArrowUpDown, Check, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setLabels } from "@/lib/sets"
import { cn } from "@/lib/utils"
import type { Workout } from "@/types/workout"
import { useTimerStore } from "./useTimerStore"
import TimerCard from "./TimerCard"
import { fmtSets, fromKg, roundWeight } from "@/lib/units"
import { suggestedSets, suggestNext } from "./overload"
import { EMPTY, useLogStore, type ToggleResult } from "./useLogStore"
import { Fragment } from "react"


type Props = { dateKey: string; workout: Workout; onNotice: (m: string) => void }

export default function ExercisePanel({ dateKey, workout, onNotice }: Props) {
  const sets = useLogStore((s) => s.sessions[dateKey]?.[workout.id]) ?? EMPTY
  const history = useLogStore((s) => s.history[workout.id])
  const timer = useTimerStore()

  const labels = setLabels(sets.map((s) => ({ type: s.type })))
  const o = workout.overload
  const sug = suggestNext(history, workout)

  const handle = (res: ToggleResult) => {
    if (res.error !== undefined) { onNotice(res.error); return }
    const parts: string[] = []
    if (res.pr) parts.push("New PR")
    if (res.finished) {
      parts.push(res.next ? `Next time: ${fmtSets(suggestedSets(workout, res.next), workout.unit)}` : "Workout done")
    } else if (res.nowDone && useTimerStore.getState().mode === "rest") {
      useTimerStore.getState().startRest()
    }
    if (parts.length) onNotice(parts.join(". "))
  }

  const logNext = () => {
    const next = sets.find((s) => !s.done)
    if (next) handle(useLogStore.getState().toggleDone(dateKey, workout, next.id))
  }

  const allDone = sets.length > 0 && sets.every((s) => s.done)
  const one = (s: { weightKg: number; reps: number }) =>
  `${roundWeight(fromKg(s.weightKg, workout.unit))} ${workout.unit} × ${s.reps}`

  return (
    <div className="pb-4">
      {o.on && allDone && sug && (
        <div className="px-4 pb-2 text-xs">
          <p className={cn("mb-1 font-semibold", sug.increase ? "text-gold" : "text-muted-foreground")}>
            Next time{sug.increase ? ": go heavier" : ": same weight"}
          </p>
          <div className="grid grid-cols-[3rem_1fr] gap-y-1">
            {suggestedSets(workout, sug).map((t, i) => (
              <Fragment key={i}>
                <span className="text-muted-foreground">Set {i + 1}</span>
                <span>{one(t)}</span>
              </Fragment>
            ))}
          </div>
        </div>
      )}

      <ul aria-label={`${workout.name} sets`}>
        {sets.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No sets planned.</li>}
        {sets.map((s, i) => (
          <li key={s.id}
            className={cn("grid grid-cols-[2.5rem_1fr_1fr_2.75rem] items-center px-4 py-1.5", i % 2 === 0 && "bg-background")}>
            <span className={cn("text-center text-sm font-bold", s.type !== "normal" && "text-primary")}>{labels[i]}</span>
            <span className="text-center text-sm">
              <b className="font-semibold tabular-nums">
                {[s, ...s.drops].map((st) => (st.weightKg == null ? "—" : roundWeight(fromKg(st.weightKg, workout.unit)))).join(" → ")}
              </b>{" "}
              <span className="text-[10px] text-muted-foreground">{workout.unit}</span>
            </span>
            <span className="text-center text-sm">
              <b className="font-semibold tabular-nums">{[s, ...s.drops].map((st) => st.reps ?? "—").join(" → ")}</b>{" "}
              <span className="text-[10px] text-muted-foreground">reps</span>
            </span>
            <button type="button" aria-pressed={s.done}
              aria-label={`Set ${labels[i]} ${s.done ? "done, tap to undo" : "not done, tap to complete"}`}
              onClick={() => handle(useLogStore.getState().toggleDone(dateKey, workout, s.id))}
              className="grid size-11 place-items-center">
              <Check className={cn("size-5 transition-colors duration-200", s.done ? "text-primary" : "text-muted-foreground/40")}
                aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4"><TimerCard /></div>

      <div className="mt-4 flex gap-2 px-4">
        <button type="button" aria-label={timer.running ? "Pause timer" : "Start timer"} onClick={timer.toggle}
          className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-background text-primary transition-transform duration-200 ease-ios active:scale-95">
          {timer.running ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
        </button>
        {timer.running && (
          <button type="button" aria-label="Switch timer mode"
            onClick={() => timer.setMode(timer.mode === "rest" ? "stopwatch" : "rest")}
            className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition-transform duration-200 ease-ios active:scale-95">
            <ArrowUpDown className="size-5" aria-hidden="true" />
          </button>
        )}
        <Button className="h-12 flex-1 text-base font-bold" onClick={logNext} disabled={sets.length === 0 || allDone}>
          Log Set
        </Button>
      </div>
    </div>
  )
}