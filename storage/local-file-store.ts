import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LocalFileStoreSnapshot } from "@/types/local-store";

const storeFileName = "local-store.json";

export function defaultLocalFileStoreSnapshot(): LocalFileStoreSnapshot {
  return {
    initialized: false,
    plans: [],
    bodyMeasurements: [],
    exerciseCatalog: [],
    completedExercises: []
  };
}

export async function readLocalFileStore() {
  try {
    const content = await readFile(localStorePath(), "utf8");
    return normalizeLocalFileStoreSnapshot(JSON.parse(content));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return defaultLocalFileStoreSnapshot();
    }

    throw error;
  }
}

export async function writeLocalFileStore(snapshot: LocalFileStoreSnapshot) {
  const filePath = localStorePath();
  const nextSnapshot = normalizeLocalFileStoreSnapshot({
    ...snapshot,
    initialized: true,
    updatedAt: new Date().toISOString()
  });
  const tempPath = `${filePath}.tmp`;

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(nextSnapshot, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);

  return nextSnapshot;
}

export function localStorePath() {
  const dataDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataDir, storeFileName);
}

export function normalizeLocalFileStoreSnapshot(input: unknown): LocalFileStoreSnapshot {
  if (!isRecord(input)) {
    return defaultLocalFileStoreSnapshot();
  }

  return {
    initialized: Boolean(input.initialized),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : undefined,
    plans: Array.isArray(input.plans) ? input.plans : [],
    bodyMeasurements: Array.isArray(input.bodyMeasurements) ? input.bodyMeasurements : [],
    exerciseCatalog: Array.isArray(input.exerciseCatalog) ? input.exerciseCatalog : [],
    completedExercises: Array.isArray(input.completedExercises) ? input.completedExercises : []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
