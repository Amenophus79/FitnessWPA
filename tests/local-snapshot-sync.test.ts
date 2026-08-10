import { describe, expect, it } from "vitest";
import { mergeLocalFileStoreSnapshots } from "@/services/local-file-store-client";
import type { BodyMeasurement, CompletedExercise, Plan } from "@/types/domain";
import type { LocalFileStoreSnapshot } from "@/types/local-store";

describe("local snapshot sync", () => {
  it("keeps local records when they are newer than the server snapshot", () => {
    const merged = mergeLocalFileStoreSnapshots(
      snapshot({
        plans: [plan({ title: "Local plan", updatedAt: "2026-07-01T10:00:00.000Z" })],
        completedExercises: [completedExercise({ completedAt: "2026-07-01T10:00:00.000Z" })]
      }),
      snapshot({
        plans: [plan({ title: "Remote stale plan", updatedAt: "2026-07-01T09:00:00.000Z" })],
        completedExercises: [completedExercise({ completedAt: "2026-07-01T09:00:00.000Z" })]
      })
    );

    expect(merged.plans[0]?.title).toBe("Local plan");
    expect(merged.completedExercises[0]?.completedAt).toBe("2026-07-01T10:00:00.000Z");
  });

  it("pulls newer server records into the local snapshot", () => {
    const merged = mergeLocalFileStoreSnapshots(
      snapshot({
        bodyMeasurements: [measurement({ id: "weight_1", weightKg: 80, measuredAt: "2026-06-30" })],
        completedExercises: [completedExercise({ completedAt: "2026-07-01T09:00:00.000Z" })]
      }),
      snapshot({
        bodyMeasurements: [
          measurement({ id: "weight_1", weightKg: 79, measuredAt: "2026-07-01" }),
          measurement({ id: "weight_2", weightKg: 78, measuredAt: "2026-07-02" })
        ],
        completedExercises: [completedExercise({ completedAt: "2026-07-01T10:00:00.000Z" })]
      })
    );

    expect(merged.bodyMeasurements.map((measurement) => measurement.weightKg)).toEqual([79, 78]);
    expect(merged.completedExercises[0]?.completedAt).toBe("2026-07-01T10:00:00.000Z");
  });

  it("keeps local catalog conflicts and appends missing remote catalog items", () => {
    const merged = mergeLocalFileStoreSnapshots(
      snapshot({
        exerciseCatalog: [
          {
            id: "easy_run",
            name: "Local easy run",
            sport: "running",
            muscles: ["legs"],
            description: "Local description.",
            defaultDurationSeconds: 1800,
            previewDurationSeconds: 60
          }
        ]
      }),
      snapshot({
        exerciseCatalog: [
          {
            id: "easy_run",
            name: "Remote easy run",
            sport: "running",
            muscles: ["legs"],
            description: "Remote description.",
            defaultDurationSeconds: 1800,
            previewDurationSeconds: 60
          },
          {
            id: "mobility_flow",
            name: "Mobility flow",
            sport: "mobility",
            muscles: ["hips"],
            description: "Open hips.",
            defaultDurationSeconds: 600,
            previewDurationSeconds: 30
          }
        ]
      })
    );

    expect(merged.exerciseCatalog.map((item) => item.name)).toEqual(["Local easy run", "Mobility flow"]);
  });

  it("does not resurrect remotely stale deleted plans", () => {
    const merged = mergeLocalFileStoreSnapshots(
      snapshot({
        deletedPlanIds: ["plan_1"]
      }),
      snapshot({
        plans: [plan({ title: "Deleted remote plan", updatedAt: "2026-07-01T12:00:00.000Z" })]
      })
    );

    expect(merged.plans).toEqual([]);
    expect(merged.deletedPlanIds).toEqual(["plan_1"]);
  });
});

function snapshot(overrides: Partial<LocalFileStoreSnapshot> = {}): LocalFileStoreSnapshot {
  return {
    initialized: true,
    updatedAt: "2026-07-01T00:00:00.000Z",
    plans: [],
    bodyMeasurements: [],
    exerciseCatalog: [],
    completedExercises: [],
    ...overrides
  };
}

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan_1",
    title: "Plan",
    startDate: "2026-07-01",
    endDate: "2026-07-07",
    durationDays: 7,
    weeks: [],
    notificationRules: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    syncStatus: "pending",
    ...overrides
  };
}

function measurement(overrides: Partial<BodyMeasurement> = {}): BodyMeasurement {
  return {
    id: "measurement_1",
    measuredAt: "2026-07-01",
    syncStatus: "pending",
    ...overrides
  };
}

function completedExercise(overrides: Partial<CompletedExercise> = {}): CompletedExercise {
  return {
    exerciseId: "exercise_1",
    activityId: "activity_1",
    planId: "plan_1",
    completedAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}
