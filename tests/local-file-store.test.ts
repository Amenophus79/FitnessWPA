import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  defaultLocalFileStoreSnapshot,
  legacyLocalStorePath,
  localStorePath,
  readLocalFileStore,
  shutdownLocalStore,
  writeLocalFileStore
} from "@/storage/local-file-store";

const originalLocalDataDir = process.env.LOCAL_DATA_DIR;

beforeEach(async () => {
  process.env.LOCAL_DATA_DIR = await mkdtemp(path.join(tmpdir(), "fitness-pwa-store-"));
});

afterEach(async () => {
  await shutdownLocalStore();
  if (originalLocalDataDir === undefined) {
    delete process.env.LOCAL_DATA_DIR;
  } else {
    process.env.LOCAL_DATA_DIR = originalLocalDataDir;
  }
});

describe("local SQLite store", () => {
  it("returns an empty snapshot when no database exists", async () => {
    await expect(readLocalFileStore()).resolves.toStrictEqual(defaultLocalFileStoreSnapshot());
    expect(localStorePath()).toContain("fitness-pwa.sqlite");
  });

  it("writes and reads a snapshot from SQLite", async () => {
    const saved = await writeLocalFileStore({
      initialized: true,
      plans: [],
      bodyMeasurements: [],
      exerciseCatalog: [
        {
          id: "bodyweight_squat",
          name: "Bodyweight squat",
          sport: "strength",
          muscles: ["quads", "glutes"],
          description: "Controlled squat.",
          defaultDurationSeconds: 40,
          previewDurationSeconds: 10,
          restDurationSeconds: 20
        }
      ],
      completedExercises: []
    });

    await expect(readLocalFileStore()).resolves.toMatchObject({
      initialized: true,
      updatedAt: saved.updatedAt,
      exerciseCatalog: [{ id: "bodyweight_squat" }]
    });
  });

  it("imports an existing JSON snapshot once into SQLite", async () => {
    await writeFile(
      legacyLocalStorePath(),
      JSON.stringify({
        initialized: true,
        updatedAt: "2026-08-01T10:00:00.000Z",
        plans: [],
        bodyMeasurements: [],
        exerciseCatalog: [],
        completedExercises: [],
        deletedPlanIds: ["legacy-plan"]
      })
    );

    await expect(readLocalFileStore()).resolves.toMatchObject({ deletedPlanIds: ["legacy-plan"] });

    await shutdownLocalStore();
    await writeFile(
      legacyLocalStorePath(),
      JSON.stringify({
        initialized: true,
        plans: [],
        bodyMeasurements: [],
        exerciseCatalog: [],
        completedExercises: [],
        deletedPlanIds: ["stale-json-change"]
      })
    );

    await expect(readLocalFileStore()).resolves.toMatchObject({ deletedPlanIds: ["legacy-plan"] });
  });
});
