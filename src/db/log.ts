import { sql, transaction } from './client';
import type { LogSet } from '@/types/log';
import type { Stage } from '@/types/workout';
import type { SetType } from '@/lib/sets';

type PerfRow = { weightKg: number; reps: number };
export type Pr = { weightKg: number; reps: number };
export type LoadedLog = {
  sessions: Record<string, Record<string, LogSet[]>>;
  history: Record<string, PerfRow[]>;
  prs: Record<string, Pr>;
};

// the most recent session in which EVERY set of this workout was finished, plus the PR
export async function loadDerived(
  workoutId: string
): Promise<{ history?: PerfRow[]; pr?: Pr }> {
  const rows = (await sql`
    SELECT l.weight_kg AS w, l.reps AS r FROM set_log l
    WHERE l.workout_id = ${workoutId} AND l.set_type = 'normal' AND l.is_done = 1
      AND l.weight_kg IS NOT NULL AND l.reps IS NOT NULL
      AND l.session_id = (
        SELECT s.id FROM session s JOIN set_log x ON x.session_id = s.id
        WHERE x.workout_id = ${workoutId}
        GROUP BY s.id HAVING MIN(x.is_done) = 1
        ORDER BY s.session_date DESC LIMIT 1)
    ORDER BY l.position`) as { w: number; r: number }[];
  const pr =
    (await sql`SELECT pr_kg, pr_reps FROM workout_pr WHERE workout_id = ${workoutId}`) as {
      pr_kg: number | null;
      pr_reps: number | null;
    }[];
  const p = pr[0];
  return {
    history: rows.length
      ? rows.map((x) => ({ weightKg: x.w, reps: x.r }))
      : undefined,
    pr:
      p && p.pr_kg != null && p.pr_reps != null
        ? { weightKg: p.pr_kg, reps: p.pr_reps }
        : undefined,
  };
}

export async function loadLog(
  workoutIds: string[],
  from: string,
  to: string
): Promise<LoadedLog> {
  const rows = (await sql`
    SELECT s.session_date AS date, l.id AS id, l.workout_id AS wid, l.set_type AS type,
           l.weight_kg AS w, l.reps AS r, l.is_done AS done
    FROM session s JOIN set_log l ON l.session_id = s.id
    WHERE s.session_date BETWEEN ${from} AND ${to} AND l.workout_id IS NOT NULL
    ORDER BY s.session_date, l.workout_id, l.position`) as {
    date: string;
    id: string;
    wid: string;
    type: string;
    w: number | null;
    r: number | null;
    done: number;
  }[];

  const dropRows = (await sql`
    SELECT d.set_log_id AS id, d.weight_kg AS w, d.reps AS r
    FROM set_log_drop d
    JOIN set_log l ON l.id = d.set_log_id
    JOIN session s ON s.id = l.session_id
    WHERE s.session_date BETWEEN ${from} AND ${to}
    ORDER BY d.set_log_id, d.stage`) as {
    id: string;
    w: number | null;
    r: number | null;
  }[];
  const drops = new Map<string, Stage[]>();
  for (const d of dropRows)
    drops.set(d.id, [...(drops.get(d.id) ?? []), { weightKg: d.w, reps: d.r }]);

  const sessions: LoadedLog['sessions'] = {};
  for (const x of rows) {
    const day = (sessions[x.date] ??= {});
    (day[x.wid] ??= []).push({
      id: x.id,
      type: x.type as SetType,
      weightKg: x.w,
      reps: x.r,
      drops: drops.get(x.id) ?? [],
      done: x.done === 1,
    });
  }

  const history: LoadedLog['history'] = {};
  const prs: LoadedLog['prs'] = {};
  for (const id of workoutIds) {
    const d = await loadDerived(id);
    if (d.history) history[id] = d.history;
    if (d.pr != null) prs[id] = d.pr;
  }
  return { sessions, history, prs };
}

export async function insertSets(
  date: string,
  ctx: { splitId: string | null; dayLabel: string },
  w: { id: string; name: string },
  sets: LogSet[]
) {
  await transaction(async (tx) => {
    await tx.sql`INSERT OR IGNORE INTO session (id, session_date, split_id, day_label)
      VALUES (${`sess-${date}`}, ${date}, ${ctx.splitId}, ${ctx.dayLabel})`;
    const found =
      (await tx.sql`SELECT id FROM session WHERE session_date = ${date}`) as {
        id: string;
      }[];
    const sid = found[0].id;
    for (const [i, s] of sets.entries()) {
      await tx.sql`INSERT OR IGNORE INTO set_log
        (id, session_id, workout_id, workout_name, position, set_type, weight_kg, reps, is_done)
        VALUES (${s.id}, ${sid}, ${w.id}, ${w.name}, ${i + 1}, ${s.type}, ${
        s.weightKg
      }, ${s.reps}, ${s.done ? 1 : 0})`;
      for (const [j, d] of s.drops.entries()) {
        await tx.sql`INSERT OR IGNORE INTO set_log_drop (set_log_id, stage, weight_kg, reps)
          VALUES (${s.id}, ${j + 1}, ${d.weightKg}, ${d.reps})`;
      }
    }
  });
}

export async function setDoneRow(id: string, done: boolean) {
  await sql`UPDATE set_log SET is_done = ${done ? 1 : 0},
    done_at = CASE WHEN ${
      done ? 1 : 0
    } = 1 THEN datetime('now') ELSE NULL END WHERE id = ${id}`;
}

export async function setAllDoneRows(
  date: string,
  workoutId: string,
  done: boolean
) {
  await sql`UPDATE set_log SET is_done = ${done ? 1 : 0},
    done_at = CASE WHEN ${done ? 1 : 0} = 1 THEN datetime('now') ELSE NULL END
    WHERE workout_id = ${workoutId}
      AND session_id = (SELECT id FROM session WHERE session_date = ${date})`;
}

// each normal set gets its own weight
export async function setTargetsById(items: { id: string; weightKg: number; reps: number }[]) {
  await transaction(async (tx) => {
    for (const it of items) {
      await tx.sql`UPDATE set_log SET weight_kg = ${it.weightKg}, reps = ${it.reps}
        WHERE id = ${it.id} AND is_done = 0`
    }
  })
}

export async function resetRows(date: string, workoutIds: string[]) {
  for (const id of workoutIds) await setAllDoneRows(date, id, false);
}
