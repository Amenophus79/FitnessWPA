import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  defaultLocalFileStoreSnapshot,
  localStorePath,
  readLocalFileStore,
  writeLocalFileStore
} from "@/storage/local-file-store";

const originalLocalDataDir = process.env.LOCAL_DATA_DIR;

beforeEach(async () => {
  process.env.LOCAL_DATA_DIR = await mkdtemp(path.join(tmpdir(), "fitness-pwa-store-"));
});

afterEach(() => {
  if (originalLocalDataDir === undefined) {
    delete process.env.LOCAL_DATA_DIR;
  } else {
    process.env.LOCAL_DATA_DIR = originalLocalDataDir;
  }
});

describe("local file store", () => {
  it("returns an empty snapshot when no file exists", async () => {
    await expect(readLocalFileStore()).resolves.toStrictEqual(defaultLocalFileStoreSnapshot());
  });

  it("writes and reads a JSON snapshot", async () => {
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

    expect(localStorePath()).toContain("local-store.json");
    await expect(readLocalFileStore()).resolves.toMatchObject({
      initialized: true,
      updatedAt: saved.updatedAt,
      exerciseCatalog: [{ id: "bodyweight_squat" }]
    });
  });
});
