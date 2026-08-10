import { describe, expect, it, vi } from "vitest";
import { SnapshotStoreCoordinator } from "@/storage/snapshot-store-coordinator";
import type { SnapshotStore, StoredSnapshot } from "@/storage/snapshot-store";
import type { LocalFileStoreSnapshot } from "@/types/local-store";

describe("snapshot store coordinator", () => {
  it("migrates a newer SQLite snapshot to discovered MariaDB", async () => {
    const local = new MemorySnapshotStore("sqlite", stored(4, ["local-plan"]));
    const remote = new MemorySnapshotStore("mariadb");
    const coordinator = createCoordinator(local, remote);

    await coordinator.initialize();

    expect(remote.record).toEqual(local.record);
    await expect(coordinator.read()).resolves.toMatchObject({ deletedPlanIds: ["local-plan"] });
  });

  it("restores SQLite from MariaDB when the local volume is new", async () => {
    const local = new MemorySnapshotStore("sqlite");
    const remote = new MemorySnapshotStore("mariadb", stored(7, ["remote-plan"]));
    const coordinator = createCoordinator(local, remote);

    await coordinator.initialize();

    expect(local.record).toEqual(remote.record);
    await expect(coordinator.read()).resolves.toMatchObject({ deletedPlanIds: ["remote-plan"] });
  });

  it("keeps writes available in SQLite while MariaDB is temporarily down", async () => {
    const local = new MemorySnapshotStore("sqlite", stored(2));
    const remote = new MemorySnapshotStore("mariadb", stored(2));
    const logger = { info: vi.fn(), warn: vi.fn() };
    const coordinator = createCoordinator(local, remote, logger);
    await coordinator.initialize();
    remote.writeError = new Error("connection lost");

    const saved = await coordinator.write(snapshot(["offline-write"]));

    expect(saved.deletedPlanIds).toEqual(["offline-write"]);
    expect(local.record).toMatchObject({ revision: 3, snapshot: { deletedPlanIds: ["offline-write"] } });
    expect(remote.record?.revision).toBe(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("MariaDB write deferred"));
  });

  it("catches MariaDB up from SQLite after connectivity returns", async () => {
    const local = new MemorySnapshotStore("sqlite", stored(2));
    const remote = new MemorySnapshotStore("mariadb", stored(2));
    const coordinator = createCoordinator(local, remote);
    await coordinator.initialize();
    remote.writeError = new Error("connection lost");
    await coordinator.write(snapshot(["created-offline"]));

    remote.writeError = undefined;
    await coordinator.read();

    expect(remote.record).toEqual(local.record);
    expect(remote.record).toMatchObject({ revision: 3, snapshot: { deletedPlanIds: ["created-offline"] } });
  });

  it("continues with SQLite when MariaDB initialization fails", async () => {
    const local = new MemorySnapshotStore("sqlite");
    const remote = new MemorySnapshotStore("mariadb");
    remote.initializeError = new Error("database unavailable");
    const logger = { info: vi.fn(), warn: vi.fn() };
    const coordinator = createCoordinator(local, remote, logger);

    await coordinator.initialize();
    await expect(coordinator.write(snapshot(["sqlite-only"]))).resolves.toMatchObject({
      deletedPlanIds: ["sqlite-only"]
    });
    expect(local.record?.revision).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("using SQLite"));
  });

  it("serializes concurrent writes so revisions cannot collide", async () => {
    const local = new MemorySnapshotStore("sqlite");
    const coordinator = createCoordinator(local);

    await Promise.all([
      coordinator.write(snapshot(["first"])),
      coordinator.write(snapshot(["second"])),
      coordinator.write(snapshot(["third"]))
    ]);

    expect(local.record).toMatchObject({ revision: 3, snapshot: { deletedPlanIds: ["third"] } });
  });
});

function createCoordinator(
  local: MemorySnapshotStore,
  remote?: MemorySnapshotStore,
  logger = { info: vi.fn(), warn: vi.fn() }
) {
  return new SnapshotStoreCoordinator({
    sqlite: local,
    legacyJsonPath: "/definitely/missing/local-store.json",
    discoverMariaDb: async () =>
      remote
        ? {
            host: "mariadb",
            port: 3306,
            username: "fitness",
            password: "secret",
            database: "homeassistant",
            ssl: false,
            source: "home-assistant"
          }
        : undefined,
    createMariaDbStore: () => remote!,
    logger,
    now: () => new Date("2026-08-10T10:00:00.000Z")
  });
}

class MemorySnapshotStore implements SnapshotStore {
  initializeError?: Error;
  writeError?: Error;

  constructor(
    readonly kind: "sqlite" | "mariadb",
    public record?: StoredSnapshot
  ) {}

  async initialize() {
    if (this.initializeError) {
      throw this.initializeError;
    }
  }

  async read() {
    return this.record;
  }

  async write(record: StoredSnapshot) {
    if (this.writeError) {
      throw this.writeError;
    }
    if (!this.record || record.revision >= this.record.revision) {
      this.record = structuredClone(record);
    }
  }

  async close() {}
}

function stored(revision: number, deletedPlanIds: string[] = []): StoredSnapshot {
  const value = snapshot(deletedPlanIds);
  return {
    revision,
    snapshot: value,
    updatedAt: value.updatedAt!
  };
}

function snapshot(deletedPlanIds: string[] = []): LocalFileStoreSnapshot {
  return {
    initialized: true,
    updatedAt: "2026-08-10T09:00:00.000Z",
    plans: [],
    bodyMeasurements: [],
    exerciseCatalog: [],
    completedExercises: [],
    deletedPlanIds
  };
}
