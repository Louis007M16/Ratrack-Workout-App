import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { fromKg, roundWeight, toKg } from '@/lib/units';
import { cleanDecimal } from '@/lib/validation';
import { cn } from '@/lib/utils';
import type { Workout } from '@/types/workout';
import { useWorkoutStore } from '@/features/workouts/useWorkoutStore';

function Form({
  workout,
  onClose,
  onSaved,
}: {
  workout: Workout;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const current = workout.overload;
  const save = useWorkoutStore((s) => s.setOverload);
  const [on, setOn] = useState(current.on);
  const [step, setStep] = useState(
    String(roundWeight(fromKg(current.stepKg, workout.unit)))
  );
  const [error, setError] = useState('');

  const submit = () => {
    const st = Number(step);
    if (!Number.isFinite(st) || st <= 0 || toKg(st, workout.unit) > 50)
      return setError('Enter a weight step above 0');
    save(workout.id, { on, stepKg: toKg(st, workout.unit) });
    onSaved?.();
    onClose();
  };

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">Progressive overload</p>
          <p className="text-xs text-muted-foreground">
            Suggest heavier weight when you hit your reps
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Progressive overload"
          onClick={() => setOn(!on)}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-ios',
            on ? 'bg-primary' : 'bg-secondary'
          )}
        >
          <span
            className={cn(
              'absolute left-0.5 top-0.5 size-6 rounded-full transition-transform duration-200 ease-ios',
              on ? 'translate-x-5 bg-primary-foreground' : 'bg-foreground'
            )}
          />
        </button>
      </div>

      <div className={cn('mt-4 transition-opacity', !on && 'opacity-40')}>
        <label htmlFor="p-step" className="text-xs text-muted-foreground">
          Add weight ({workout.unit})
        </label>
        <Input
          id="p-step"
          inputMode="decimal"
          disabled={!on}
          value={step}
          onChange={(e) => {
            setStep(cleanDecimal(e.target.value));
            setError('');
          }}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Hit your planned reps on every set, then add {step || "?"} {workout.unit} and restart at 8 reps, with 2 fewer on the last set.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button size="lg" onClick={submit}>
          Save
        </Button>
      </div>
    </div>
  );
}

type Props = {
  workout: Workout;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
};

export default function ProgressionDrawer({
  workout,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="px-5 pb-3 pt-3 text-left">
          <DrawerTitle>{workout.name}</DrawerTitle>
        </DrawerHeader>
        <Form
          key={String(open)}
          workout={workout}
          onClose={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DrawerContent>
    </Drawer>
  );
}
