import { mkdir } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { normalizeLocalFileStoreSnapshot } from "@/storage/local-store-snapshot";
import { localStorePath } from "@/storage/local-store-paths";
import type { SnapshotStore, StoredSnapshot } from "@/storage/snapshot-store";

interface SnapshotRow {
  revision: number;
  snapshot_json: string;
  updated_at: string;
}

export class SqliteSnapshotStore implements SnapshotStore {
  readonly kind = "sqlite" as const;
  private database?: Database.Database;

  constructor(readonly filePath = localStorePath()) {}

  async initialize() {
    if (this.database) {
      return;
    }

    await mkdir(path.dirname(this.filePath), { recursive: true });
    const database = new Database(this.filePath);
    database.pragma("journal_mode = WAL");
    database.pragma("synchronous = FULL");
    database.exec(`
      CREATE TABLE IF NOT EXISTS fitness_pwa_state (
        state_key TEXT PRIMARY KEY,
        revision INTEGER NOT NULL,
        snapshot_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    this.database = database;
  }

  async read() {
    const row = this.getDatabase()
      .prepare("SELECT revision, snapshot_json, updated_at FROM fitness_pwa_state WHERE state_key = ?")
      .get("snapshot") as SnapshotRow | undefined;

    if (!row) {
      return undefined;
    }

    return {
      revision: row.revision,
      snapshot: normalizeLocalFileStoreSnapshot(JSON.parse(row.snapshot_json)),
      updatedAt: row.updated_at
    } satisfies StoredSnapshot;
  }

  async write(record: StoredSnapshot) {
    this.getDatabase()
      .prepare(`
        INSERT INTO fitness_pwa_state (state_key, revision, snapshot_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(state_key) DO UPDATE SET
          revision = excluded.revision,
          snapshot_json = excluded.snapshot_json,
          updated_at = excluded.updated_at
        WHERE excluded.revision >= fitness_pwa_state.revision
      `)
      .run("snapshot", record.revision, JSON.stringify(record.snapshot), record.updatedAt);
  }

  async close() {
    this.database?.close();
    this.database = undefined;
  }

  private getDatabase() {
    if (!this.database) {
      throw new Error("SQLite snapshot store has not been initialized.");
    }

    return this.database;
  }
}
