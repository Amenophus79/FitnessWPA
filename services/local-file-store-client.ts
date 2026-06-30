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
  completedExercises = []
}: {
  plans: Plan[];
  bodyMeasurements: BodyMeasurement[];
  exerciseCatalog: ExerciseCatalogItem[];
  completedExercises?: CompletedExercise[];
}): LocalFileStoreSnapshot {
  return {
    initialized: true,
    updatedAt: new Date().toISOString(),
    plans,
    bodyMeasurements,
    exerciseCatalog,
    completedExercises
  };
}

export function hasLocalFileStoreData(snapshot: LocalFileStoreSnapshot) {
  return (
    snapshot.initialized ||
    snapshot.plans.length > 0 ||
    snapshot.bodyMeasurements.length > 0 ||
    snapshot.exerciseCatalog.length > 0 ||
    snapshot.completedExercises.length > 0
  );
}
