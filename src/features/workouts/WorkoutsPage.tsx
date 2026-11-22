import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import Chips from '@/components/shared/Chips';
import KebabMenu from '@/components/shared/KebabMenu';
import { MUSCLES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useWorkoutStore } from './useWorkoutStore';
import WorkoutFormSheet from './WorkoutFormSheet';
import SetEditorPanel from './SetEditorPanel';
import type { Workout } from '@/types/workout';
import Collapse from '@/components/shared/Collapse';
import { useSplitStore } from '@/features/splits/useSplitStore';
import { fmtWeight } from '@/lib/units';
import { useLogStore } from '@/features/session/useLogStore';

export default function WorkoutsPage() {
  const { workouts, remove } = useWorkoutStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Workout | undefined>();
  const [deleting, setDeleting] = useState<Workout | undefined>();
  const prs = useLogStore((s) => s.prs);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = workouts.filter(
      (w) =>
        (filter === 'All' || w.muscle === filter) &&
        w.name.toLowerCase().includes(q)
    );
    return MUSCLES.map((m) => ({
      muscle: m,
      items: shown.filter((w) => w.muscle === m),
    })).filter((g) => g.items.length > 0);
  }, [workouts, query, filter]);

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (w: Workout) => {
    setEditing(w);
    setFormOpen(true);
  };
  const purgeWorkout = useSplitStore((s) => s.purgeWorkout);

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workout</h1>
        <Button size="sm" onClick={openNew}>
          + Add
        </Button>
      </header>

      <Input
        className="mt-4"
        type="search"
        placeholder="Search Exercise"
        aria-label="Search exercise"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <Chips
        items={['All', ...MUSCLES]}
        value={filter}
        onChange={setFilter}
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1"
      />

      {groups.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p className="font-semibold text-foreground">No workouts found</p>
          <p className="mt-1 text-sm">
            Try another search, or add a new workout.
          </p>
          <Button className="mt-4" onClick={openNew}>
            + Add workout
          </Button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.muscle} className="mt-10">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-lg font-bold">{g.muscle}</h2>
              <span className="text-sm text-muted-foreground">
                {g.items.length}
              </span>
            </div>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {g.items.map((w) => {
                const open = openId === w.id;
                return (
                  <li key={w.id}>
                    <div className="flex items-center pl-4 pr-1">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenId(open ? null : w.id)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 py-3.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {w.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {w.sets.length === 0
                              ? 'No sets yet'
                              : `${w.sets.length} ${
                                  w.sets.length === 1 ? 'set' : 'sets'
                                } | ${
                                  prs[w.id]
                                    ? `PR: ${fmtWeight(
                                        prs[w.id].weightKg,
                                        w.unit
                                      )} • ${prs[w.id].reps} reps`
                                    : 'No PR yet'
                                }`}
                          </span>
                        </span>
                        <ChevronRight
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-ios',
                            open && 'rotate-90'
                          )}
                          aria-hidden="true"
                        />
                      </button>
                      <KebabMenu
                        label={`Options for ${w.name}`}
                        items={[
                          { label: 'Edit', onSelect: () => openEdit(w) },
                          {
                            label: 'Delete',
                            onSelect: () => setDeleting(w),
                            destructive: true,
                          },
                        ]}
                      />
                    </div>
                    <Collapse open={open}>
                      <SetEditorPanel
                        key={w.id}
                        workout={w}
                        onDone={() => setOpenId(null)}
                      />
                    </Collapse>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <WorkoutFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        workout={editing}
      />

      <Drawer
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
      >
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="px-5 pb-1 pt-3 text-left">
            <DrawerTitle>Delete {deleting?.name}?</DrawerTitle>
          </DrawerHeader>
          <p className="px-5 text-sm text-muted-foreground">
            It will be removed from your workout list.
          </p>
          <div className="grid grid-cols-2 gap-3 px-5 pb-8 pt-5">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setDeleting(undefined)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => {
                if (deleting) {
                  remove(deleting.id);
                  purgeWorkout(deleting.id);
                }
                setDeleting(undefined);
              }}
            >
              Delete
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
