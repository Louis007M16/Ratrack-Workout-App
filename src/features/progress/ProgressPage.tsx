import { useState } from "react"
import { useNavigate } from "react-router"
import { ChevronRight } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Input } from "@/components/ui/input"
import FlowHeader from "@/components/shared/FlowHeader"
import Chips from "@/components/shared/Chips"
import { fmtWeight } from "@/lib/units"
import { cn } from "@/lib/utils"
import { useWorkoutStore } from "@/features/workouts/useWorkoutStore"
import { useSettingsStore } from "@/features/profile/useSettingsStore"
import { loadMonthDetail, loadMonths, loadWorkoutSummaries } from "@/db/progress"
import { useQuery } from "./useQuery"
import { chart, fmtVolume, lastMonths, monthLabel, monthTitle, prevMonth, shortDate } from "./format"

function WorkoutsTab() {
  const navigate = useNavigate()
  const workouts = useWorkoutStore((s) => s.workouts)
  const [q, setQ] = useState("")
  const summaries = useQuery(loadWorkoutSummaries, [])

  const rows = (summaries.data ?? [])
    .map((s) => ({ s, w: workouts.find((x) => x.id === s.workoutId) }))
    .filter((r): r is { s: (typeof r)["s"]; w: NonNullable<(typeof r)["w"]> } => !!r.w && r.w.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.s.lastDate.localeCompare(a.s.lastDate))

  if (summaries.loading) return <p className="mt-10 text-center text-sm text-muted-foreground">Loading…</p>
  if (!summaries.data?.length)
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
        <p className="font-semibold text-foreground">No progress yet</p>
        <p className="mt-1 text-sm">Finish a workout on the Home tab and it will show up here.</p>
      </div>
    )

  return (
    <div>
      <Input type="search" placeholder="Search workouts" aria-label="Search workouts" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {rows.map(({ s, w }) => (
          <li key={w.id}>
            <button type="button" onClick={() => navigate(`/profile/progress/${w.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-secondary/60">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{w.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {w.muscle} · {s.sessions} {s.sessions === 1 ? "session" : "sessions"} · last {shortDate(s.lastDate)}
                </span>
              </span>
              <span className="text-sm font-semibold text-primary">{fmtWeight(s.bestKg, w.unit)}</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No matches.</li>}
      </ul>
    </div>
  )
}

type Metric = "days" | "sets" | "volumeKg"
const METRICS: { key: Metric; label: string }[] = [
  { key: "days", label: "Sessions" },
  { key: "sets", label: "Sets" },
  { key: "volumeKg", label: "Volume" },
]

function Delta({ now, before }: { now: number; before: number | undefined }) {
  if (before == null || before === 0) return null
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return <span className="text-xs text-muted-foreground">same as last month</span>
  return (
    <span className={cn("text-xs", pct > 0 ? "text-primary" : "text-muted-foreground")}>
      {pct > 0 ? "+" : ""}{pct}% vs last month
    </span>
  )
}

function MonthlyTab() {
  const unit = useSettingsStore((s) => s.defaultUnit)
  const months = useQuery(loadMonths, [])
  const keys = lastMonths(6)
  const [sel, setSel] = useState(keys[keys.length - 1])
  const [metric, setMetric] = useState<Metric>("days")
  const detail = useQuery(() => loadMonthDetail(sel), [sel])

  if (months.loading) return <p className="mt-10 text-center text-sm text-muted-foreground">Loading…</p>

  const by = new Map((months.data ?? []).map((m) => [m.month, m]))
  const cur = by.get(sel)
  const before = by.get(prevMonth(sel))
  const data = keys.map((k) => {
    const m = by.get(k)
    const raw = m ? m[metric] : 0
    return { label: monthLabel(k).split(" ")[0], value: metric === "volumeKg" ? Math.round(raw * (unit === "lbs" ? 2.20462 : 1)) : raw }
  })
  const labels = keys.map(monthLabel)

  return (
    <div>
      <div role="group" aria-label="Chart metric" className="inline-flex rounded-full bg-secondary p-1">
        {METRICS.map((m) => (
          <button key={m.key} type="button" aria-pressed={metric === m.key} onClick={() => setMetric(m.key)}
            className={cn("rounded-full px-4 py-1.5 text-sm transition-colors duration-200",
              metric === m.key ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground")}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 h-52 rounded-2xl border border-border bg-card p-3" role="img"
        aria-label={`Bar chart of ${METRICS.find((m) => m.key === metric)?.label.toLowerCase()} for the last 6 months`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tick={chart.tick} axisLine={false} tickLine={false} />
            <YAxis tick={chart.tick} axisLine={false} tickLine={false} allowDecimals={false}
              tickFormatter={(v: number) => new Intl.NumberFormat(undefined, { notation: "compact" }).format(v)} />
            <Tooltip {...chart.tooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="value" name={METRICS.find((m) => m.key === metric)?.label} fill="var(--gold)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Chips items={labels} value={monthLabel(sel)} onChange={(l) => setSel(keys[labels.indexOf(l)])}
        className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" />

      <h2 className="mt-5 text-lg font-bold">{monthTitle(sel)}</h2>
      {!cur ? (
        <p className="mt-2 text-sm text-muted-foreground">No finished workouts this month.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: "Sessions", value: String(cur.days), now: cur.days, was: before?.days },
              { label: "Sets", value: String(cur.sets), now: cur.sets, was: before?.sets },
              { label: "Reps", value: cur.reps.toLocaleString(), now: cur.reps, was: before?.reps },
              { label: "Volume", value: fmtVolume(cur.volumeKg, unit), now: cur.volumeKg, was: before?.volumeKg },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-[11px] text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-primary">{c.value}</p>
                <Delta now={c.now} before={c.was} />
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Workouts this month</h3>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {(detail.data ?? []).map((w) => (
              <li key={w.name} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{w.name}</span>
                  <span className="block text-xs text-muted-foreground">{w.sets} sets · {w.reps} reps</span>
                </span>
                <span className="text-sm text-muted-foreground">{fmtWeight(w.bestKg, unit)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default function ProgressPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<"Workouts" | "Monthly">("Workouts")
  return (
    <div className="pb-6">
      <FlowHeader title="Progress" onBack={() => navigate("/profile")} />
      <Chips items={["Workouts", "Monthly"]} value={tab} onChange={(v) => setTab(v as "Workouts" | "Monthly")}
        className="mb-4 flex gap-2" />
      {tab === "Workouts" ? <WorkoutsTab /> : <MonthlyTab />}
    </div>
  )
}