export const MIGRATIONS: string[][] = [
  [
    `CREATE TABLE app_setting (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,

    // ---------- workouts ----------
    `CREATE TABLE workout (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE,
      muscle_group TEXT NOT NULL,
      weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg','lbs')),
      overload_on INTEGER NOT NULL DEFAULT 1 CHECK (overload_on IN (0,1)),
      weight_step_kg REAL NOT NULL DEFAULT 2.5 CHECK (weight_step_kg > 0),
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX idx_workout_name ON workout (name) WHERE deleted_at IS NULL`,

    // the workout's own plan. Weights are ALWAYS stored in kg.
    `CREATE TABLE workout_set (
      workout_id TEXT NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
      position INTEGER NOT NULL CHECK (position >= 1),
      set_type TEXT NOT NULL DEFAULT 'normal' CHECK (set_type IN ('warmup','normal','drop')),
      weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0),
      reps INTEGER CHECK (reps IS NULL OR reps >= 1),
      PRIMARY KEY (workout_id, position)
    )`,

    // ---------- splits ----------
    `CREATE TABLE split (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE,
      kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('preset','custom')),
      is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0,1)),
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX idx_split_name ON split (name) WHERE deleted_at IS NULL`,
    // at most one active split
    `CREATE UNIQUE INDEX idx_one_active_split ON split (is_active)
       WHERE is_active = 1 AND deleted_at IS NULL`,

    `CREATE TABLE split_day (
      split_id TEXT NOT NULL REFERENCES split(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Monday
      label TEXT NOT NULL DEFAULT '',
      is_rest INTEGER NOT NULL DEFAULT 0 CHECK (is_rest IN (0,1)),
      PRIMARY KEY (split_id, day_of_week)
    )`,
    `CREATE TABLE split_day_muscle (
      split_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      muscle TEXT NOT NULL,
      PRIMARY KEY (split_id, day_of_week, muscle),
      FOREIGN KEY (split_id, day_of_week) REFERENCES split_day(split_id, day_of_week) ON DELETE CASCADE
    )`,
    `CREATE TABLE split_day_workout (
      split_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 1),
      workout_id TEXT NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
      PRIMARY KEY (split_id, day_of_week, position),
      UNIQUE (split_id, day_of_week, workout_id),
      FOREIGN KEY (split_id, day_of_week) REFERENCES split_day(split_id, day_of_week) ON DELETE CASCADE
    )`,

    // ---------- training history ----------
    // one session per calendar day (local date, 'YYYY-MM-DD')
    `CREATE TABLE session (
      id TEXT PRIMARY KEY,
      session_date TEXT NOT NULL UNIQUE,
      split_id TEXT REFERENCES split(id) ON DELETE SET NULL,
      day_label TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    )`,

    // One row per set shown on the logging screen. workout_name is copied
    // so history survives if the workout is deleted.
    `CREATE TABLE set_log (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
      workout_id TEXT REFERENCES workout(id) ON DELETE SET NULL,
      workout_name TEXT NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 1),
      set_type TEXT NOT NULL DEFAULT 'normal' CHECK (set_type IN ('warmup','normal','drop')),
      weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0),
      reps INTEGER CHECK (reps IS NULL OR reps >= 1),
      is_done INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0,1)),
      done_at TEXT,
      UNIQUE (session_id, workout_id, position)
    )`,
    `CREATE INDEX idx_set_log_workout ON set_log (workout_id, is_done, done_at)`,
    `CREATE INDEX idx_set_log_session ON set_log (session_id)`,

    // extra stages of a drop set, for the workout's plan
    `CREATE TABLE workout_set_drop (
      workout_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      stage INTEGER NOT NULL CHECK (stage >= 1),
      weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0),
      reps INTEGER CHECK (reps IS NULL OR reps >= 1),
      PRIMARY KEY (workout_id, position, stage),
      FOREIGN KEY (workout_id, position) REFERENCES workout_set(workout_id, position) ON DELETE CASCADE
    )`,
    // extra stages of a drop set, for logged sets
    `CREATE TABLE set_log_drop (
      set_log_id TEXT NOT NULL REFERENCES set_log(id) ON DELETE CASCADE,
      stage INTEGER NOT NULL CHECK (stage >= 1),
      weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0),
      reps INTEGER CHECK (reps IS NULL OR reps >= 1),
      PRIMARY KEY (set_log_id, stage)
    )`,

    // ---------- views ----------
    // PR = the heaviest finished normal set, with the most reps done at that weight
    `CREATE VIEW workout_pr AS
        SELECT l.workout_id AS workout_id, l.weight_kg AS pr_kg, MAX(l.reps) AS pr_reps
        FROM set_log l
        WHERE l.workout_id IS NOT NULL AND l.is_done = 1 AND l.set_type = 'normal'
          AND l.weight_kg IS NOT NULL AND l.reps IS NOT NULL
          AND l.weight_kg = (
            SELECT MAX(x.weight_kg) FROM set_log x
            WHERE x.workout_id = l.workout_id AND x.is_done = 1
              AND x.set_type = 'normal' AND x.weight_kg IS NOT NULL)
        GROUP BY l.workout_id`,
  ],
];
