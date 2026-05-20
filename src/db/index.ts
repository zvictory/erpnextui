import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

// Keep the SQLite store under data/ so the deploy rsync (which excludes data/)
// never overwrites or deletes it. Override via DATABASE_PATH for tests/scripts.
const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "oee.db");
const dbPath = process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
