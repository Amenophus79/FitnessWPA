import { readFile } from "node:fs/promises";
import { discoverMariaDb, type MariaDbConfig } from "@/storage/mariadb-discovery";
import { MariaDbSnapshotStore } from "@/storage/mariadb-snapshot-store";
import { legacyLocalStorePath } from "@/storage/local-store-paths";
import {
  defaultLocalFileStoreSnapshot,
  hasLocalFileStoreSnapshotData,
  normalizeLocalFileStoreSnapshot
} from "@/storage/local-store-snapshot";
import type { SnapshotStore, StoredSnapshot } from "@/storage/snapshot-store";
import { SqliteSnapshotStore } from "@/storage/sqlite-snapshot-store";
import type { LocalFileStoreSnapshot } from "@/types/local-store";

interface StorageLogger {
  info(message: string): void;
  warn(message: string): void;
}

export interface SnapshotStoreCoordinatorOptions {
  sqlite?: SnapshotStore;
  discoverMariaDb?: () => Promise<MariaDbConfig | undefined>;
  createMariaDbStore?: (config: MariaDbConfig) => SnapshotStore;
  legacyJsonPath?: string;
  logger?: StorageLogger;
  now?: () => Date;
}

export class SnapshotStoreCoordinator {
  private readonly sqlite: SnapshotStore;
  private readonly discoverMariaDbConfig: () => Promise<MariaDbConfig | undefined>;
  private readonly createMariaDbStore: (config: MariaDbConfig) => SnapshotStore;
  private readonly legacyJsonPath: string;
  private readonly logger: StorageLogger;
  private readonly now: () => Date;
  private mariaDb?: SnapshotStore;
  private initialized = false;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(options: SnapshotStoreCoordinatorOptions = {}) {
    this.sqlite = options.sqlite ?? new SqliteSnapshotStore();
    this.discoverMariaDbConfig = options.discoverMariaDb ?? (() => discoverMariaDb());
    this.createMariaDbStore = options.createMariaDbStore ?? ((config) => new MariaDbSnapshotStore(config));
    this.legacyJsonPath = options.legacyJsonPath ?? legacyLocalStorePath();
    this.logger = options.logger ?? console;
    this.now = options.now ?? (() => new Date());
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    await this.sqlite.initialize();
    await this.importLegacyJsonIfNeeded();

    const mariaDbConfig = await this.discoverMariaDbConfig();
    if (mariaDbConfig) {
      const mariaDb = this.createMariaDbStore(mariaDbConfig);
      try {
        await mariaDb.initialize();
        this.mariaDb = mariaDb;
        await this.reconcileStores();
        this.logger.info(`Fitness PWA storage: MariaDB active (${mariaDbConfig.source}); SQLite mirror retained.`);
      } catch (error) {
        await mariaDb.close().catch(() => undefined);
        this.logger.warn(`Fitness PWA storage: MariaDB unavailable, using SQLite (${errorMessage(error)}).`);
      }
    } else {
      this.logger.info("Fitness PWA storage: no MariaDB service discovered; using SQLite.");
    }

    this.initialized = true;
  }

  async read(): Promise<LocalFileStoreSnapshot> {
    await this.initialize();
    const local = await this.sqlite.read();

    if (!this.mariaDb) {
      return local?.snapshot ?? defaultLocalFileStoreSnapshot();
    }

    try {
      const remote = await this.mariaDb.read();
      const selected = selectNewestRecord(local, remote);

      if (!selected) {
        return defaultLocalFileStoreSnapshot();
      }

      if (!local || selected.revision > local.revision || selected.updatedAt !== local.updatedAt) {
        await this.sqlite.write(selected);
      }
      if (!remote || selected.revision > remote.revision || selected.updatedAt !== remote.updatedAt) {
        await this.mariaDb.write(selected);
      }

      return selected.snapshot;
    } catch (error) {
      this.logger.warn(`Fitness PWA storage: MariaDB read failed, using SQLite (${errorMessage(error)}).`);
      return local?.snapshot ?? defaultLocalFileStoreSnapshot();
    }
  }

  write(snapshot: LocalFileStoreSnapshot): Promise<LocalFileStoreSnapshot> {
    const operation = this.writeQueue.then(() => this.writeImmediately(snapshot));
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  private async writeImmediately(snapshot: LocalFileStoreSnapshot): Promise<LocalFileStoreSnapshot> {
    await this.initialize();
    const updatedAt = this.now().toISOString();
    const normalized = normalizeLocalFileStoreSnapshot({ ...snapshot, initialized: true, updatedAt });
    const current = await this.sqlite.read();
    const record: StoredSnapshot = {
      revision: (current?.revision ?? 0) + 1,
      snapshot: normalized,
      updatedAt
    };

    await this.sqlite.write(record);

    if (this.mariaDb) {
      try {
        await this.mariaDb.write(record);
      } catch (error) {
        this.logger.warn(`Fitness PWA storage: MariaDB write deferred; SQLite is current (${errorMessage(error)}).`);
      }
    }

    return normalized;
  }

  async close() {
    await this.mariaDb?.close();
    await this.sqlite.close();
    this.initialized = false;
  }

  private async importLegacyJsonIfNeeded() {
    if (await this.sqlite.read()) {
      return;
    }

    try {
      const snapshot = normalizeLocalFileStoreSnapshot(JSON.parse(await readFile(this.legacyJsonPath, "utf8")));
      if (!hasLocalFileStoreSnapshotData(snapshot)) {
        return;
      }

      const updatedAt = snapshot.updatedAt ?? this.now().toISOString();
      await this.sqlite.write({ revision: 1, snapshot: { ...snapshot, updatedAt }, updatedAt });
      this.logger.info("Fitness PWA storage: imported legacy local-store.json into SQLite.");
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }

  private async reconcileStores() {
    if (!this.mariaDb) {
      return;
    }

    const local = await this.sqlite.read();
    const remote = await this.mariaDb.read();
    const selected = selectNewestRecord(local, remote);

    if (!selected) {
      return;
    }

    if (!local || selected.revision > local.revision || selected.updatedAt !== local.updatedAt) {
      await this.sqlite.write(selected);
    }
    if (!remote || selected.revision > remote.revision || selected.updatedAt !== remote.updatedAt) {
      await this.mariaDb.write(selected);
    }
  }
}

function selectNewestRecord(left?: StoredSnapshot, right?: StoredSnapshot) {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  if (left.revision !== right.revision) {
    return left.revision > right.revision ? left : right;
  }
  return Date.parse(left.updatedAt) >= Date.parse(right.updatedAt) ? left : right;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}
