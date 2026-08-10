import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";
import type { MariaDbConfig } from "@/storage/mariadb-discovery";
import { normalizeLocalFileStoreSnapshot } from "@/storage/local-store-snapshot";
import type { SnapshotStore, StoredSnapshot } from "@/storage/snapshot-store";

interface SnapshotRow extends RowDataPacket {
  revision: number | string;
  snapshot_json: string;
  updated_at: string;
}

export class MariaDbSnapshotStore implements SnapshotStore {
  readonly kind = "mariadb" as const;
  private pool?: Pool;

  constructor(readonly config: MariaDbConfig) {}

  async initialize() {
    if (this.pool) {
      return;
    }

    const pool = createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? {} : undefined,
      connectionLimit: 4,
      connectTimeout: 5_000,
      enableKeepAlive: true,
      waitForConnections: true
    });

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS fitness_pwa_state (
          state_key VARCHAR(64) PRIMARY KEY,
          revision BIGINT UNSIGNED NOT NULL,
          snapshot_json LONGTEXT NOT NULL,
          updated_at VARCHAR(40) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      this.pool = pool;
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  async read() {
    const [rows] = await this.getPool().query<SnapshotRow[]>(
      "SELECT revision, snapshot_json, updated_at FROM fitness_pwa_state WHERE state_key = ?",
      ["snapshot"]
    );
    const row = rows[0];

    if (!row) {
      return undefined;
    }

    return {
      revision: Number(row.revision),
      snapshot: normalizeLocalFileStoreSnapshot(JSON.parse(row.snapshot_json)),
      updatedAt: row.updated_at
    } satisfies StoredSnapshot;
  }

  async write(record: StoredSnapshot) {
    await this.getPool().query(
      `
        INSERT INTO fitness_pwa_state (state_key, revision, snapshot_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          snapshot_json = IF(VALUES(revision) >= revision, VALUES(snapshot_json), snapshot_json),
          updated_at = IF(VALUES(revision) >= revision, VALUES(updated_at), updated_at),
          revision = GREATEST(revision, VALUES(revision))
      `,
      ["snapshot", record.revision, JSON.stringify(record.snapshot), record.updatedAt]
    );
  }

  async close() {
    await this.pool?.end();
    this.pool = undefined;
  }

  private getPool() {
    if (!this.pool) {
      throw new Error("MariaDB snapshot store has not been initialized.");
    }

    return this.pool;
  }
}
