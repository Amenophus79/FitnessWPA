import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import type { BodyMeasurement, CompletedExercise, Plan } from "@/types/domain";
import type { LocalFileStoreSnapshot } from "@/types/local-store";

export async function loadLocalFileStoreSnapshot() {
  const response = await fetch("/api/local-store", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Local file store is not available.");
  }

  return (await response.json()) as LocalFileStoreSnapshot;
}

export async function saveLocalFileStoreSnapshot(snapshot: LocalFileStoreSnapshot) {
  const response = await fetch("/api/local-store", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(snapshot)
  });

  if (!response.ok) {
    throw new Error("Local file store could not be saved.");
  }

  return (await response.json()) as LocalFileStoreSnapshot;
}

export function createLocalFileStoreSnapshot({
  plans,
  bodyMeasurements,
  exerciseCatalog,
  completedExercises = [],
  deletedPlanIds = []
}: {
  plans: Plan[];
  bodyMeasurements: BodyMeasurement[];
  exerciseCatalog: ExerciseCatalogItem[];
  completedExercises?: CompletedExercise[];
  deletedPlanIds?: string[];
}): LocalFileStoreSnapshot {
  return {
    initialized: true,
    updatedAt: new Date().toISOString(),
    plans,
    bodyMeasurements,
    exerciseCatalog,
    completedExercises,
    deletedPlanIds
  };
}

export function mergeLocalFileStoreSnapshots(
  localSnapshot: LocalFileStoreSnapshot,
  remoteSnapshot?: LocalFileStoreSnapshot
): LocalFileStoreSnapshot {
  if (!remoteSnapshot || !hasLocalFileStoreData(remoteSnapshot)) {
    return {
      ...localSnapshot,
      initialized: true,
      updatedAt: new Date().toISOString()
    };
  }

  const deletedPlanIds = mergeIds(localSnapshot.deletedPlanIds ?? [], remoteSnapshot.deletedPlanIds ?? []);
  const deletedPlanIdSet = new Set(deletedPlanIds);

  return {
    initialized: true,
    updatedAt: newestTimestamp(localSnapshot.updatedAt, remoteSnapshot.updatedAt) ?? new Date().toISOString(),
    plans: mergeRecords(localSnapshot.plans, remoteSnapshot.plans, (plan) => plan.id, (plan) => plan.updatedAt ?? plan.createdAt).filter(
      (plan) => !deletedPlanIdSet.has(plan.id)
    ),
    bodyMeasurements: mergeRecords(
      localSnapshot.bodyMeasurements,
      remoteSnapshot.bodyMeasurements,
      (measurement) => measurement.id,
      (measurement) => measurement.measuredAt
    ),
    exerciseCatalog: mergeRecords(localSnapshot.exerciseCatalog, remoteSnapshot.exerciseCatalog, (item) => item.id),
    completedExercises: mergeRecords(
      localSnapshot.completedExercises,
      remoteSnapshot.completedExercises,
      (exercise) => exercise.exerciseId,
      (exercise) => exercise.completedAt
    ),
    deletedPlanIds
  };
}

export function hasLocalFileStoreData(snapshot: LocalFileStoreSnapshot) {
  return (
    snapshot.initialized ||
    snapshot.plans.length > 0 ||
    snapshot.bodyMeasurements.length > 0 ||
    snapshot.exerciseCatalog.length > 0 ||
    snapshot.completedExercises.length > 0 ||
    Boolean(snapshot.deletedPlanIds?.length)
  );
}

function mergeIds(localIds: string[], remoteIds: string[]) {
  return [...new Set([...localIds, ...remoteIds])];
}

function mergeRecords<T>(
  localRecords: T[],
  remoteRecords: T[],
  getId: (record: T) => string,
  getUpdatedAt?: (record: T) => string | undefined
) {
  const merged = new Map<string, T>();
  localRecords.forEach((record) => merged.set(getId(record), record));

  remoteRecords.forEach((remoteRecord) => {
    const id = getId(remoteRecord);
    const localRecord = merged.get(id);

    if (!localRecord || isRemoteRecordNewer(localRecord, remoteRecord, getUpdatedAt)) {
      merged.set(id, remoteRecord);
    }
  });

  return [...merged.values()];
}

function isRemoteRecordNewer<T>(
  localRecord: T,
  remoteRecord: T,
  getUpdatedAt?: (record: T) => string | undefined
) {
  if (!getUpdatedAt) {
    return false;
  }

  const localTime = parseTimestamp(getUpdatedAt(localRecord));
  const remoteTime = parseTimestamp(getUpdatedAt(remoteRecord));

  return remoteTime > localTime;
}

function newestTimestamp(left?: string, right?: string) {
  const leftTime = parseTimestamp(left);
  const rightTime = parseTimestamp(right);

  if (leftTime === 0 && rightTime === 0) {
    return undefined;
  }

  return rightTime > leftTime ? right : left;
}

function parseTimestamp(value?: string) {
  if (!value) {
    return 0;
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}
