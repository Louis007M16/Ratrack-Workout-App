import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Collapse from '@/components/shared/Collapse';
import KebabMenu from '@/components/shared/KebabMenu';
import { SHORT_DAYS, currentWeek, dateKey, mondayIndex } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { isTrainingDay } from '@/types/split';
import type { Workout } from '@/types/workout';
import { useSplitStore } from '@/features/splits/useSplitStore';
import { useWorkoutStore } from '@/features/workouts/useWorkoutStore';
import { useLogStore } from './useLogStore';
import ExercisePanel from './ExercisePanel';
import ProgressionDrawer from './ProgressionDrawer';
import { fmtSets, fmtWeight } from '@/lib/units';
import { suggestedSets, suggestNext } from './overload';

export default function HomePage() {
  const splits = useSplitStore((s) => s.splits);
  const workouts = useWorkoutStore((s) => s.workouts);
  const sessions = useLogStore((s) => s.sessions);
  const history = useLogStore((s) => s.history);
  const prs = useLogStore((s) => s.prs);

  const week = useMemo(() => currentWeek(), []);
  const todayIdx = mondayIndex(new Date());
  const [sel, setSel] = useState(todayIdx);
  const [openId, setOpenId] = useState<string | null>(null);
  const [progFor, setProgFor] = useState<Workout | null>(null);
  const [notice, setNotice] = useState('');
  const timer = useRef<number>(0);

  const notify = useCallback((m: string) => {
    setNotice(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(''), 3500);
  }, []);

  const active = splits.find((s) => s.isActive);
  const day = active?.days[sel];
  const key = dateKey(week[sel]);

  const dayWorkouts = useMemo<Workout[]>(
    () =>
      day && !day.isRest
        ? day.workoutIds
            .map((id) => workouts.find((w) => w.id === id))
            .filter((w): w is Workout => !!w)
        : [],
    [day, workouts]
  );

  const ids = dayWorkouts.map((w) => w.id).join(',');
  useEffect(() => {
    if (!active) return;
    const { ensureSets } = useLogStore.getState();
    dayWorkouts.forEach((w) =>
      ensureSets(key, w, { splitId: active.id, dayLabel: day?.label ?? '' })
    );
  }, [key, ids, active?.id]);

  useEffect(() => setOpenId(null), [sel]);

  const stats = useMemo(() => {
    let sets = 0,
      reps = 0,
      days = 0;
    for (const d of week) {
      const logged = sessions[dateKey(d)];
      if (!logged) continue;
      let any = false;
      for (const list of Object.values(logged))
        for (const s of list)
          if (s.done && s.type !== 'warmup') {
            sets++;
            reps +=
              (s.reps ?? 0) + s.drops.reduce((n, d) => n + (d.reps ?? 0), 0);
            any = true;
          }
      if (any) days++;
    }
    return { sets, reps, days };
  }, [sessions, week]);

  const planned = active ? active.days.filter(isTrainingDay).length : 0;
  const isDone = (w: Workout) => {
    const list = sessions[key]?.[w.id];
    return !!list && list.length > 0 && list.every((s) => s.done);
  };
  const doneCount = dayWorkouts.filter(isDone).length;
  const pct = dayWorkouts.length
    ? Math.round((doneCount / dayWorkouts.length) * 100)
    : 0;

  const completeRow = (w: Workout, done: boolean) => {
    const res = useLogStore.getState().setAllDone(key, w, !done);
    if (res.error !== undefined) {
      notify(res.error);
      return;
    }
    const parts: string[] = [];

    if (res.pr) parts.push('New PR');

    if (res.finished) {
      parts.push(
        res.next
          ? `Next time: ${fmtSets(suggestedSets(w, res.next), w.unit)}`
          : 'Workout done'
      );
    }
    if (parts.length) notify(parts.join('. '));
  };

  if (!active) {
    return (
      <div className="mt-16 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
        <p className="font-semibold text-foreground">No active split</p>
        <p className="mt-1 text-sm">Pick a split to start logging workouts.</p>
        <Button className="mt-4" render={<Link to="/program" />}>
          Go to Program
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{active.name}</h1>
        <span className="mt-1.5 text-[11px] font-black italic tracking-wide text-muted-foreground/30">
          RATRACK
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Weekly Session', value: `${stats.days} / ${planned}` },
          { label: 'Sets', value: String(stats.sets) },
          { label: 'Reps', value: String(stats.reps) },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card p-3"
          >
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className="mt-3 text-xl font-bold tabular-nums text-primary">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-semibold">Weekly Schedule</h2>
      <div
        role="tablist"
        aria-label="Days of this week"
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {week.map((d, i) => {
          const rest = active.days[i].isRest;
          const on = sel === i;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSel(i)}
              className={cn(
                'min-w-[4.5rem] shrink-0 rounded-2xl border px-3 py-3 text-center transition-[background-color,border-color,transform] duration-200 ease-ios active:scale-95',
                on
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card'
              )}
            >
              <span className="block text-base">{SHORT_DAYS[i]}</span>
              <span className="block text-lg font-bold">
                {rest ? 'Rest' : String(d.getDate()).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        {day?.isRest ? (
          <div className="py-6 text-center">
            <h3 className="text-xl font-bold">{day.label || 'Rest Day'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Recover and come back stronger.
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-bold">{day?.label || 'Workout'}</h3>
            {day && day.muscles.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {day.muscles.join(' • ')}
              </p>
            )}

            <div className="mt-3 flex items-end gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Workout Progress</span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <div
                  className="mt-1 h-1 overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-label="Workout progress"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500 ease-ios"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  useLogStore.getState().resetDay(
                    key,
                    dayWorkouts.map((w) => w.id)
                  )
                }
                className="rounded-md border border-primary/60 bg-gold-dim px-2.5 py-1 text-[10px] font-semibold text-gold transition-transform duration-200 active:scale-95"
              >
                RESET
              </button>
            </div>

            {dayWorkouts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p>No workouts planned for this day.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  render={<Link to={`/program/${active.id}`} />}
                >
                  Edit split
                </Button>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-border border-t border-border">
                {dayWorkouts.map((w, i) => {
                  const open = openId === w.id;
                  const done = isDone(w);
                  const pr = prs[w.id];
                  const increase =
                    !done && !!suggestNext(history[w.id], w)?.increase;
                  const toggle = () => setOpenId(open ? null : w.id);
                  return (
                    <li key={w.id}>
                      <div className="flex items-center gap-1 py-2.5">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={toggle}
                          className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
                        >
                          <span className="w-6 text-sm font-semibold text-primary">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-bold">
                                {w.name}
                              </span>
                              {increase && (
                                <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                                  Increase weight
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              PR:{' '}
                              {pr
                                ? `${fmtWeight(pr.weightKg, w.unit)} • ${
                                    pr.reps
                                  } reps`
                                : '—'}
                            </span>
                          </span>
                        </button>

                        {open && (
                          <KebabMenu
                            label={`Options for ${w.name}`}
                            items={[
                              {
                                label: 'Progression settings',
                                onSelect: () => setProgFor(w),
                              },
                            ]}
                          />
                        )}

                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={
                            done
                              ? `Mark ${w.name} not done`
                              : `Complete all sets of ${w.name}`
                          }
                          onClick={() => completeRow(w, done)}
                          className="grid size-11 shrink-0 place-items-center"
                        >
                          <span
                            className={cn(
                              'grid size-5 place-items-center rounded-md border transition-colors duration-200',
                              done
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground'
                            )}
                          >
                            {done && (
                              <Check className="size-3.5" aria-hidden="true" />
                            )}
                          </span>
                        </button>

                        <button
                          type="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          onClick={toggle}
                          className="grid size-9 shrink-0 place-items-center text-muted-foreground"
                        >
                          <ChevronRight
                            className={cn(
                              'size-4 transition-transform duration-300 ease-ios',
                              open && 'rotate-90'
                            )}
                          />
                        </button>
                      </div>

                      <div className="-mx-4">
                        <Collapse open={open}>
                          <ExercisePanel
                            dateKey={key}
                            workout={w}
                            onNotice={notify}
                          />
                        </Collapse>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>

      {progFor && (
        <ProgressionDrawer
          workout={progFor}
          open
          onOpenChange={(o) => !o && setProgFor(null)}
          onSaved={() => {
            const fresh = useWorkoutStore
              .getState()
              .workouts.find((x) => x.id === progFor.id);
            if (fresh) useLogStore.getState().applySuggestion(key, fresh);
          }}
        />
      )}

      {notice && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
