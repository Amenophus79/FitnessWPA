import { describe, expect, it } from "vitest";
import { calculateStatistics } from "@/features/statistics/statistics-service";
import { demoMeasurements, demoPlan } from "@/features/seed/default-plan";

describe("statistics", () => {
  it("calculates volume, distance, completion, and trends", () => {
    const completedPlan = structuredClone(demoPlan);
    const firstActivity = completedPlan.weeks[0]?.days[0]?.activities[0];
    if (firstActivity) {
      firstActivity.completedAt = `${completedPlan.weeks[0]?.days[0]?.date}T07:30:00.000Z`;
      firstActivity.exercises[0]!.completedAt = firstActivity.completedAt;
    }

    const measurements = [
      {
        id: "measurement_1",
        measuredAt: "2026-06-17",
        weightKg: 78.4,
        bmi: 23.8,
        bodyFatPercent: 17.5,
        syncStatus: "pending" as const
      },
      {
        id: "measurement_2",
        measuredAt: "2026-06-24",
        weightKg: 77.9,
        bmi: 23.6,
        bodyFatPercent: 17.1,
        syncStatus: "pending" as const
      }
    ];

    const stats = calculateStatistics([completedPlan], measurements, new Date("2026-06-17T12:00:00.000Z"));
    expect(stats.weeklyVolumeMinutes).toBeGreaterThan(0);
    expect(stats.runningDistanceKm).toBeGreaterThan(0);
    expect(stats.weightTrend).toHaveLength(2);
  });

  it("ships the marathon tabata start plan without completed progress", () => {
    const stats = calculateStatistics([demoPlan], demoMeasurements, new Date("2026-06-17T12:00:00.000Z"));

    expect(demoPlan.title).toBe("Marathon 2026 + Tabata Strength Support");
    expect(demoPlan.startDate).toBe("2026-06-17");
    expect(demoPlan.endDate).toBe("2026-09-12");
    expect(stats.weeklyVolumeMinutes).toBe(0);
  });
});
