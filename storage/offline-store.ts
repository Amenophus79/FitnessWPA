import { createId } from "@/services/id";
import { getDatabase, type SyncQueueItem } from "@/storage/indexed-db";
import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import type { BodyMeasurement, CompletedExercise, Plan, Statistics } from "@/types/domain";

const initialSeedMetadataKey = "initialSeedInstalled";

export interface LocalSeedData {
  plans: Plan[];
  bodyMeasurements: BodyMeasurement[];
  exerciseCatalog: ExerciseCatalogItem[];
}

export async function initializeLocalSeed(seed: LocalSeedData) {
  const db = await getDatabase();
  const seedState = await db.get("metadata", initialSeedMetadataKey);

  if (!seedState?.value) {
    const existingPlans = await db.getAll("plans");
    const existingMeasurements = await db.getAll("bodyMeasurements");
    const existingCatalog = await db.getAll("exerciseCatalog");
    const tx = db.transaction(["plans", "bodyMeasurements", "exerciseCatalog", "metadata"], "readwrite");

    if (existingPlans.length === 0) {
      await Promise.all(seed.plans.map((plan) => tx.objectStore("plans").put(plan)));
    }

    if (existingMeasurements.length === 0) {
      await Promise.all(seed.bodyMeasurements.map((measurement) => tx.objectStore("bodyMeasurements").put(measurement)));
    }

    if (existingCatalog.length === 0) {
      await Promise.all(seed.exerciseCatalog.map((item) => tx.objectStore("exerciseCatalog").put(item)));
    }

    await tx.objectStore("metadata").put({
      key: initialSeedMetadataKey,
      value: true,
      updatedAt: new Date().toISOString()
    });
    await tx.done;
  }

  return {
    plans: await db.getAll("plans"),
    bodyMeasurements: await db.getAll("bodyMeasurements"),
    exerciseCatalog: await db.getAll("exerciseCatalog")
  };
}

export async function savePlan(plan: Plan) {
  const db = await getDatabase();
  await db.put("plans", plan);
  await enqueueSync("plan", plan.id, "upsert", plan);
}

export async function deletePlan(planId: string) {
  const db = await getDatabase();
  await db.delete("plans", planId);
  await enqueueSync("plan", planId, "delete");
}

export async function replacePlans(plans: Plan[]) {
  const db = await getDatabase();
  const tx = db.transaction("plans", "readwrite");
  await tx.store.clear();
  await Promise.all(plans.map((plan) => tx.store.put(plan)));
  await tx.done;
}

export async function listPlans() {
  return (await getDatabase()).getAll("plans");
}

export async function saveBodyMeasurement(measurement: BodyMeasurement) {
  const db = await getDatabase();
  await db.put("bodyMeasurements", measurement);
  await enqueueSync("bodyMeasurement", measurement.id, "upsert", measurement);
}

export async function listBodyMeasurements() {
  return (await getDatabase()).getAll("bodyMeasurements");
}

export async function replaceBodyMeasurements(measurements: BodyMeasurement[]) {
  const db = await getDatabase();
  const tx = db.transaction("bodyMeasurements", "readwrite");
  await tx.store.clear();
  await Promise.all(measurements.map((measurement) => tx.store.put(measurement)));
  await tx.done;
}

export async function saveCompletedExercise(completedExercise: CompletedExercise) {
  const db = await getDatabase();
  await db.put("completedExercises", completedExercise);
  await enqueueSync("completedExercise", completedExercise.exerciseId, "upsert", completedExercise);
}

export async function listCompletedExercises() {
  return (await getDatabase()).getAll("completedExercises");
}

export async function saveExerciseCatalogItems(items: ExerciseCatalogItem[]) {
  await replaceExerciseCatalogItems(items);
}

export async function replaceExerciseCatalogItems(items: ExerciseCatalogItem[]) {
  const db = await getDatabase();
  const tx = db.transaction("exerciseCatalog", "readwrite");
  await tx.store.clear();
  await Promise.all(items.map((item) => tx.store.put(item)));
  await tx.done;
}

export async function listExerciseCatalogItems() {
  return (await getDatabase()).getAll("exerciseCatalog");
}

export async function saveStatistics(statistics: Statistics) {
  const db = await getDatabase();
  await db.put("statistics", statistics, "latest");
}

export async function loadStatistics() {
  const db = await getDatabase();
  return db.get("statistics", "latest");
}

export async function enqueueSync(
  entity: SyncQueueItem["entity"],
  entityId: string,
  action: SyncQueueItem["action"],
  payload?: unknown
) {
  const db = await getDatabase();
  await db.put("syncQueue", {
    id: createId("sync"),
    entity,
    entityId,
    action,
    payload,
    createdAt: new Date().toISOString()
  });
}

export async function listSyncQueue() {
  return (await getDatabase()).getAll("syncQueue");
}

export async function removeSyncItem(id: string) {
  return (await getDatabase()).delete("syncQueue", id);
}
