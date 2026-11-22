import { useEffect, useState } from "react"
import { Hourglass, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import { elapsedMs, useTimerStore } from "./useTimerStore"

const PRESETS = [60, 180, 300]

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [active])
  return now
}

const mmss = (ms: number) => {
  const total = Math.floor(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}
const preset = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

export default function TimerCard() {
  const t = useTimerStore()
  const now = useNow(t.running)
  const elapsed = elapsedMs(t, now)
  const total = t.restSeconds * 1000
  const rest = t.mode === "rest"
  const remaining = Math.max(0, total - elapsed)
  const shown = rest ? remaining : elapsed
  const finished = rest && !t.running && t.baseMs >= total

  const line = rest ? Math.min(100, (elapsed / total) * 100) : t.running || elapsed > 0 ? 100 : 0

  return (
    <div className="px-4">
      <div role="group" aria-label="Timer mode" className="mx-auto flex w-fit rounded-full bg-background p-1 text-xs">
        {([
          { m: "rest", label: "Rest", Icon: Hourglass },
          { m: "stopwatch", label: "Set Timer", Icon: Timer },
        ] as const).map(({ m, label, Icon }) => (
          <button
            key={m}
            type="button"
            aria-pressed={t.mode === m}
            onClick={() => t.mode !== m && t.setMode(m)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors duration-200",
              t.mode === m ? "bg-gold-dim font-semibold text-gold" : "text-muted-foreground"
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {rest && !t.running ? (
        <>
          <div className="mt-4 flex items-center justify-center gap-5">
            <button type="button" aria-label="Subtract 15 seconds" onClick={() => t.setRest(t.restSeconds - 15)}
              className="grid size-11 place-items-center rounded-full border border-primary/70 text-xs text-gold active:scale-95">
              -15
            </button>
            <p role="timer" className="text-5xl font-bold tabular-nums">{mmss(shown)}</p>
            <button type="button" aria-label="Add 15 seconds" onClick={() => t.setRest(t.restSeconds + 15)}
              className="grid size-11 place-items-center rounded-full border border-primary/70 text-xs text-gold active:scale-95">
              +15
            </button>
          </div>
          <p className="mt-1 text-center text-xs text-muted-foreground">{finished ? "Rest over" : "Rest between sets"}</p>
          <div className="my-3 h-px bg-border" />
          <div className="flex justify-center gap-3">
            {PRESETS.map((p) => (
              <button key={p} type="button" aria-pressed={t.restSeconds === p} onClick={() => t.setRest(p)}
                className={cn(
                  "rounded-lg border px-3.5 py-1.5 text-xs transition-colors duration-200",
                  t.restSeconds === p ? "border-primary bg-gold-dim text-gold" : "border-border text-muted-foreground"
                )}>
                {preset(p)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 text-center">
          <p role="timer" className={cn("text-5xl font-bold tabular-nums transition-colors", t.running && "text-primary")}>
            {mmss(shown)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{rest ? "Resting" : "Time under tension"}</p>
          <div className="mt-3 h-0.5 w-full overflow-hidden rounded bg-border">
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${line}%` }} />
          </div>
          {t.running && (
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              {rest ? "Next set starts when you are ready" : "Stopwatch running"}
            </p>
          )}
        </div>
      )}
    </div>
  )
}