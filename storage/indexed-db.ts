import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import type { BodyMeasurement, CompletedExercise, Plan, Statistics } from "@/types/domain";

interface SyncQueueItem {
  id: string;
  entity: "plan" | "bodyMeasurement" | "completedExercise";
  entityId: string;
  action: "upsert" | "delete";
  payload?: unknown;
  createdAt: string;
}

interface FitnessDatabase extends DBSchema {
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: string;
    };
  };
  plans: {
    key: string;
    value: Plan;
    indexes: { "by-updated-at": string };
  };
  bodyMeasurements: {
    key: string;
    value: BodyMeasurement;
    indexes: { "by-measured-at": string };
  };
  completedExercises: {
    key: string;
    value: CompletedExercise;
    indexes: { "by-completed-at": string };
  };
  exerciseCatalog: {
    key: string;
    value: ExerciseCatalogItem;
    indexes: { "by-sport": string };
  };
  statistics: {
    key: string;
    value: Statistics;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { "by-created-at": string };
  };
}

let database: Promise<IDBPDatabase<FitnessDatabase>> | undefined;

export function getDatabase() {
  database ??= openDB<FitnessDatabase>("fitness-pwa", 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("plans")) {
        const plans = db.createObjectStore("plans", { keyPath: "id" });
        plans.createIndex("by-updated-at", "updatedAt");
      }

      if (!db.objectStoreNames.contains("bodyMeasurements")) {
        const bodyMeasurements = db.createObjectStore("bodyMeasurements", { keyPath: "id" });
        bodyMeasurements.createIndex("by-measured-at", "measuredAt");
      }

      if (!db.objectStoreNames.contains("completedExercises")) {
        const completedExercises = db.createObjectStore("completedExercises", { keyPath: "exerciseId" });
        completedExercises.createIndex("by-completed-at", "completedAt");
      }

      if (!db.objectStoreNames.contains("exerciseCatalog")) {
        const exerciseCatalog = db.createObjectStore("exerciseCatalog", { keyPath: "id" });
        exerciseCatalog.createIndex("by-sport", "sport");
      }

      if (!db.objectStoreNames.contains("statistics")) {
        db.createObjectStore("statistics");
      }

      if (!db.objectStoreNames.contains("syncQueue")) {
        const syncQueue = db.createObjectStore("syncQueue", { keyPath: "id" });
        syncQueue.createIndex("by-created-at", "createdAt");
      }
    }
  });

  return database;
}

export type { SyncQueueItem };
