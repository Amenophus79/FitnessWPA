import type { LocalFileStoreSnapshot } from "@/types/local-store";

export function defaultLocalFileStoreSnapshot(): LocalFileStoreSnapshot {
  return {
    initialized: false,
    profiles: [],
    plans: [],
    bodyMeasurements: [],
    exerciseCatalog: [],
    completedExercises: [],
    deletedPlanIds: []
  };
}

export function normalizeLocalFileStoreSnapshot(input: unknown): LocalFileStoreSnapshot {
  if (!isRecord(input)) {
    return defaultLocalFileStoreSnapshot();
  }

  return {
    initialized: Boolean(input.initialized),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : undefined,
    profiles: Array.isArray(input.profiles) ? input.profiles.filter((id): id is string => typeof id === "string" && id.trim().length > 0) : [],
    plans: Array.isArray(input.plans) ? input.plans : [],
    bodyMeasurements: Array.isArray(input.bodyMeasurements) ? input.bodyMeasurements : [],
    exerciseCatalog: Array.isArray(input.exerciseCatalog) ? input.exerciseCatalog : [],
    completedExercises: Array.isArray(input.completedExercises) ? input.completedExercises : [],
    deletedPlanIds: Array.isArray(input.deletedPlanIds) ? input.deletedPlanIds.filter((id) => typeof id === "string") : []
  };
}

export function hasLocalFileStoreSnapshotData(snapshot: LocalFileStoreSnapshot) {
  return (
    snapshot.initialized ||
    Boolean(snapshot.profiles?.length) ||
    snapshot.plans.length > 0 ||
    snapshot.bodyMeasurements.length > 0 ||
    snapshot.exerciseCatalog.length > 0 ||
    snapshot.completedExercises.length > 0 ||
    Boolean(snapshot.deletedPlanIds?.length)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
