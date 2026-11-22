import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import Chips from "@/components/shared/Chips"
import KebabMenu, { type MenuItem } from "@/components/shared/KebabMenu"
import { DAY_LETTERS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { isTrainingDay, type Split } from "@/types/split"
import { useSplitStore } from "./useSplitStore"

export default function SplitsPage() {
  const navigate = useNavigate()
  const { splits, startDraft, setActive, duplicate, remove } = useSplitStore()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const [deleting, setDeleting] = useState<Split | undefined>()

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return splits.filter(
      (s) => (filter === "All" || s.kind === filter.toLowerCase()) && s.name.toLowerCase().includes(q)
    )
  }, [splits, query, filter])

  const openEditor = (id?: string) => {
    startDraft(id)
    navigate("/program/schedule")
  }

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Splits</h1>
        <Button size="sm" onClick={() => openEditor()}>+ New Split</Button>
      </header>

      <Input className="mt-4" type="search" placeholder="Search Splits" aria-label="Search splits"
        value={query} onChange={(e) => setQuery(e.target.value)} />
      <Chips items={["All", "Preset", "Custom"]} value={filter} onChange={setFilter}
        className="mt-3 flex gap-2" />

      {shown.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p className="font-semibold text-foreground">{splits.length ? "No splits found" : "No splits yet"}</p>
          <p className="mt-1 text-sm">{splits.length ? "Try another search or filter." : "Create a split to plan your week."}</p>
          <Button className="mt-4" onClick={() => openEditor()}>+ New Split</Button>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {shown.map((s) => {
            const trainingDays = s.days.filter(isTrainingDay).length
            const exercises = s.days.reduce((n, d) => n + (d.isRest ? 0 : d.workoutIds.length), 0)
            const items: MenuItem[] = [
              { label: "Edit", onSelect: () => openEditor(s.id) },
              { label: "Duplicate", onSelect: () => duplicate(s.id) },
              ...(!s.isActive ? [{ label: "Delete", onSelect: () => setDeleting(s), destructive: true }] : []),
            ]
            return (
              <li key={s.id}
                className={cn(
                  "rounded-2xl border p-4 transition-colors duration-300 ease-ios",
                  s.isActive ? "border-primary bg-gold-dim" : "border-border bg-card"
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/program/${s.id}`)}
                    className="block w-full min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-lg font-bold">{s.name}</span>
                      {s.isActive && (
                        <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                          Active
                        </span>
                      )}
                    </span>
                    <span className="mt-3 flex gap-1.5" aria-hidden="true">
                      {s.days.map((d, i) => (
                        <span key={i}
                          className={cn(
                            "grid size-8 place-items-center rounded-lg border text-xs font-semibold",
                            isTrainingDay(d)
                              ? "border-primary bg-primary text-primary-foreground"
                              : s.isActive
                                ? "border-primary/30 text-gold/70"
                                : "border-border text-muted-foreground"
                          )}>
                          {DAY_LETTERS[i]}
                        </span>
                      ))}
                    </span>
                  </button>
                  <KebabMenu label={`Options for ${s.name}`} items={items} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className={cn("text-xs", s.isActive ? "text-gold/70" : "text-muted-foreground")}>
                    {trainingDays} {trainingDays === 1 ? "day" : "days"}, {exercises} exercises
                  </p>
                  {!s.isActive && (
                    <Button variant="outline" size="sm" onClick={() => setActive(s.id)}>Set as Active</Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Drawer open={!!deleting} onOpenChange={(o) => !o && setDeleting(undefined)}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="px-5 pb-1 pt-3 text-left">
            <DrawerTitle>Delete {deleting?.name}?</DrawerTitle>
          </DrawerHeader>
          <p className="px-5 text-sm text-muted-foreground">Your logged workouts stay in your history.</p>
          <div className="grid grid-cols-2 gap-3 px-5 pb-8 pt-5">
            <Button variant="secondary" size="lg" onClick={() => setDeleting(undefined)}>Cancel</Button>
            <Button variant="destructive" size="lg"
              onClick={() => { if (deleting) remove(deleting.id); setDeleting(undefined) }}>Delete</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}