import { sql } from './client';

export async function getSetting(key: string): Promise<string | null> {
  const rows =
    (await sql`SELECT value FROM app_setting WHERE key = ${key}`) as {
      value: string;
    }[];
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await sql`INSERT INTO app_setting (key, value) VALUES (${key}, ${value})
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
}
