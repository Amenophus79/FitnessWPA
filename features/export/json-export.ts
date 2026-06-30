import type { BodyMeasurement, CompletedExercise, Plan, Statistics } from "@/types/domain";

export interface FitnessExport {
  exportedAt: string;
  version: "1.0";
  plans: Plan[];
  bodyMeasurements: BodyMeasurement[];
  completedExercises: CompletedExercise[];
  statistics: Statistics;
}

export function createFitnessExport(input: Omit<FitnessExport, "exportedAt" | "version">): FitnessExport {
  return {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    ...input
  };
}

export function stringifyFitnessExport(exportData: FitnessExport) {
  return JSON.stringify(exportData, null, 2);
}
