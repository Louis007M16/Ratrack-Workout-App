import { useMemo, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import FlowHeader from "@/components/shared/FlowHeader"
import { fmtWeight, fromKg, roundWeight } from "@/lib/units"
import { cn } from "@/lib/utils"
import { useWorkoutStore } from "@/features/workouts/useWorkoutStore"
import { loadWorkoutSeries, loadWorkoutSets, type SetRow } from "@/db/progress"
import { useQuery } from "./useQuery"
import { chart, fmtVolume, shortDate } from "./format"
import { useLogStore } from "@/features/session/useLogStore"

export default function WorkoutProgressPage() {
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const w = useWorkoutStore((s) => s.workouts.find((x) => x.id === id))
  const [metric, setMetric] = useState<"weight" | "volume">("weight")
  const series = useQuery(() => loadWorkoutSeries(id), [id])
  const sets = useQuery(() => loadWorkoutSets(id), [id])

  const grouped = useMemo(() => {
    const m = new Map<string, SetRow[]>()
    for (const r of sets.data ?? []) m.set(r.date, [...(m.get(r.date) ?? []), r])
    return [...m.entries()].slice(0, 15)
  }, [sets.data])

  if (!w) return <Navigate to="/profile/progress" replace />

  const pts = (series.data ?? []).map((p) => ({
    label: shortDate(p.date),
    weight: roundWeight(fromKg(p.bestKg, w.unit)),
    volume: Math.round(fromKg(p.volumeKg, w.unit)),
  }))
  const raw = series.data ?? []
  const change = raw.length > 1 ? roundWeight(fromKg(raw[raw.length - 1].bestKg - raw[0].bestKg, w.unit)) : null
  const total = raw.reduce((n, p) => n + p.volumeKg, 0)
  const pr = useLogStore((s) => s.prs[id])

  return (
    <div className="pb-6">
      <FlowHeader title="Progress" onBack={() => navigate("/profile/progress")} />
      <h2 className="text-2xl font-bold">{w.name}</h2>
      <p className="text-sm text-muted-foreground">{w.muscle}</p>

      {series.loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : raw.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p className="font-semibold text-foreground">No finished sets yet</p>
          <p className="mt-1 text-sm">Complete this workout on the Home tab to start your chart.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Personal best", value: pr ? `${fmtWeight(pr.weightKg, w.unit)} × ${pr.reps}` : "—" },
              { label: "Sessions", value: String(raw.length) },
              { label: "Change since first", value: change == null ? "—" : `${change > 0 ? "+" : ""}${change} ${w.unit}` },
              { label: "Total volume", value: fmtVolume(total, w.unit) },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-[11px] text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-primary">{c.value}</p>
              </div>
            ))}
          </div>

          <div role="group" aria-label="Chart metric" className="mt-5 inline-flex rounded-full bg-secondary p-1">
            {([["weight", "Best weight"], ["volume", "Volume"]] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={metric === k} onClick={() => setMetric(k)}
                className={cn("rounded-full px-4 py-1.5 text-sm transition-colors duration-200",
                  metric === k ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground")}>
                {label}
              </button>
            ))}
          </div>

          {pts.length < 2 ? (
            <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Finish this workout on one more day to see your trend line.
            </p>
          ) : (
            <div className="mt-3 h-56 rounded-2xl border border-border bg-card p-3" role="img"
              aria-label={`Line chart of ${metric === "weight" ? "best weight" : "volume"} per session`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pts} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" tick={chart.tick} axisLine={false} tickLine={false} />
                  <YAxis tick={chart.tick} axisLine={false} tickLine={false} domain={["auto", "auto"]}
                    tickFormatter={(v: number) => new Intl.NumberFormat(undefined, { notation: "compact" }).format(v)} />
                  <Tooltip {...chart.tooltip} />
                  <Line type="monotone" dataKey={metric} name={metric === "weight" ? `Best (${w.unit})` : `Volume (${w.unit})`}
                    stroke="var(--gold)" strokeWidth={2} dot={{ r: 3, fill: "var(--gold)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <h3 className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">History</h3>
          <ul className="space-y-2">
            {grouped.map(([date, rows]) => (
              <li key={date} className="rounded-2xl border border-border bg-card px-4 py-3">
                <p className="text-sm font-semibold">
                  {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rows.map((r) => `${r.type === "warmup" ? "W " : r.type === "drop" ? "D " : ""}${roundWeight(fromKg(r.weightKg, w.unit))} x ${r.reps}`).join("   ")}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}