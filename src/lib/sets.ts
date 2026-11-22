export type SetType = 'warmup' | 'normal' | 'drop';

export const SET_TYPES: { type: SetType; label: string; badge: string }[] = [
  { type: 'warmup', label: 'Warm-Up Set', badge: 'W' },
  { type: 'normal', label: 'Normal Set', badge: '1' },
  { type: 'drop', label: 'Drop Set', badge: 'D' },
];

// W for warm-ups, D for drop sets, and normal sets count 1, 2, 3...
export function setLabels(sets: { type: SetType }[]) {
  let n = 0;
  return sets.map((s) =>
    s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : String(++n)
  );
}
