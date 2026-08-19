import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import type { BodyMeasurement, CompletedExercise, Plan } from "@/types/domain";

export interface LocalFileStoreSnapshot {
  initialized: boolean;
  updatedAt?: string;
  profiles?: string[];
  plans: Plan[];
  bodyMeasurements: BodyMeasurement[];
  exerciseCatalog: ExerciseCatalogItem[];
  completedExercises: CompletedExercise[];
  deletedPlanIds?: string[];
}
