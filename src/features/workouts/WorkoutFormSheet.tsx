import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Chips from '@/components/shared/Chips';
import { MUSCLES } from '@/lib/constants';
import { fromKg, roundWeight, toKg, type Unit } from '@/lib/units';
import { cn } from '@/lib/utils';
import { useWorkoutStore } from './useWorkoutStore';
import { DEFAULT_OVERLOAD, type Workout } from '@/types/workout';
import { useSettingsStore } from '@/features/profile/useSettingsStore';

const num = z.string().regex(/^(\d+(\.\d+)?)?$/, 'Numbers only');

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a workout name').max(60),
  muscle: z.string().min(1, 'Pick a muscle group'),
  unit: z.enum(['kg', 'lbs']),
  sets: z.array(z.object({ weight: num, reps: num })),
});
type FormValues = z.infer<typeof schema>;

const makeBlank = (unit: Unit): FormValues => ({
  name: '',
  muscle: '',
  unit,
  sets: [1, 2, 3].map(() => ({ weight: '', reps: '' })),
});

const toForm = (w: Workout): FormValues => ({
  name: w.name,
  muscle: w.muscle,
  unit: w.unit,
  sets: w.sets.map((s) => ({
    weight:
      s.weightKg == null ? '' : String(roundWeight(fromKg(s.weightKg, w.unit))),
    reps: s.reps == null ? '' : String(s.reps),
  })),
});

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workout?: Workout;
};

export default function WorkoutFormSheet({
  open,
  onOpenChange,
  workout,
}: Props) {
  const save = useWorkoutStore((s) => s.save);
  const defaultUnit = useSettingsStore((s) => s.defaultUnit);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: makeBlank(defaultUnit),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'sets',
  });
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;
  const unit = watch('unit');
  const muscle = watch('muscle');

  useEffect(() => {
    if (open) reset(workout ? toForm(workout) : makeBlank(defaultUnit));
  }, [open, workout, reset, defaultUnit]);

  const changeUnit = (next: Unit) => {
    watch('sets').forEach((s, i) => {
      if (s.weight === '') return;
      const kg = toKg(Number(s.weight), unit);
      setValue(`sets.${i}.weight`, String(roundWeight(fromKg(kg, next))));
    });
    setValue('unit', next);
  };

  const onSubmit = (v: FormValues) => {
    const newSets = v.sets
      .filter((s) => s.weight !== '' || s.reps !== '')
      .map((s) => ({
        type: 'normal' as const,
        weightKg: s.weight === '' ? null : toKg(Number(s.weight), v.unit),
        reps: s.reps === '' ? null : Number(s.reps),
        drops: [],
      }));
    const res = save({
      id: workout?.id,
      name: v.name.trim(),
      muscle: v.muscle as Workout['muscle'],
      unit: workout ? workout.unit : v.unit,
      sets: workout ? workout.sets : newSets,
      overload: workout?.overload ?? DEFAULT_OVERLOAD,
    });
    if (!res.ok) {
      form.setError('name', { message: res.error });
      return;
    }
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto flex max-h-[92dvh] max-w-md flex-col">
        <DrawerHeader className="shrink-0 px-5 pb-2 pt-3 text-left">
          <DrawerTitle className="text-xl">
            {workout ? 'Edit Workout' : 'New Workout'}
          </DrawerTitle>
        </DrawerHeader>

        {/* only this part scrolls */}
        <div
          data-vaul-no-drag
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4"
        >
          <form
            id="workout-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label htmlFor="wname" className="text-sm text-muted-foreground">
                Workout Name
              </label>
              <Input
                id="wname"
                placeholder="e.g. Barbell Press"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">
                Muscle Group
              </span>
              <Chips
                items={MUSCLES}
                value={muscle}
                onChange={(m) =>
                  setValue('muscle', m, { shouldValidate: true })
                }
                className="flex flex-wrap gap-2"
              />
              {errors.muscle && (
                <p className="text-sm text-destructive">
                  {errors.muscle.message}
                </p>
              )}
            </div>

            {!workout && (
              <>
                <div className="flex items-center justify-between">
                  <div
                    role="group"
                    aria-label="Weight unit"
                    className="flex rounded-full bg-secondary p-1"
                  >
                    {(['kg', 'lbs'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        aria-pressed={unit === u}
                        onClick={() => changeUnit(u)}
                        className={cn(
                          'rounded-full px-4 py-1 text-sm',
                          unit === u
                            ? 'bg-primary font-semibold text-primary-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {u === 'kg' ? 'Kg' : 'Lbs'}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Add set"
                    onClick={() => append({ weight: '', reps: '' })}
                  >
                    +
                  </Button>
                </div>

                <div className="divide-y divide-border">
                  {fields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2 py-2.5">
                      <span className="w-6 shrink-0 text-center text-2xl font-semibold">
                        {i + 1}
                      </span>
                      <Input
                        inputMode="decimal"
                        placeholder={`Weight (${unit})`}
                        aria-label={`Set ${i + 1} weight`}
                        {...register(`sets.${i}.weight`)}
                      />
                      <Input
                        inputMode="numeric"
                        placeholder="Reps"
                        aria-label={`Set ${i + 1} reps`}
                        {...register(`sets.${i}.reps`)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove set ${i + 1}`}
                        onClick={() => remove(i)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-muted-foreground">
                    Sets are optional. You can add them later.
                  </p>
                </div>
              </>
            )}
          </form>
        </div>

        {/* fixed at the bottom, always visible */}
        <DrawerFooter className="grid shrink-0 grid-cols-2 gap-3 px-5 pb-6 pt-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="workout-form" size="lg">
            Save Workout
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
