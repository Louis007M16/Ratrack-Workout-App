import { sql, transaction } from './client';
import { MIGRATIONS } from './schema';

let ready: Promise<void> | null = null;

export function initDb() {
  ready ??= (async () => {
    await sql`PRAGMA foreign_keys = ON`;
    const rows = (await sql`PRAGMA user_version`) as { user_version: number }[];
    for (let v = rows[0].user_version; v < MIGRATIONS.length; v++) {
      await transaction(async (tx) => {
        for (const statement of MIGRATIONS[v]) await tx.sql(statement);
        await tx.sql(`PRAGMA user_version = ${v + 1}`);
      });
    }
  })();
  return ready;
}
