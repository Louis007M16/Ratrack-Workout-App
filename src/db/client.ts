import { SQLocal } from "sqlocal"

export const { sql, transaction } = new SQLocal("ratrack.sqlite3")