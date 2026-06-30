import { describe, expect, it } from "vitest";
import { parseTrainingPlanJson } from "@/features/import/training-plan-schema";

const validPlan = {
  version: "1.0",
  title: "Test plan",
  startDate: "2026-08-03",
  durationDays: 7,
  exercises: [
    {
      id: "pushup",
      name: "Push-up",
      sport: "strength",
      muscles: ["chest"],
      description: "Controlled push-up",
      imageUrl: "https://example.com/pushup.jpg",
      videoUrl: "https://example.com/pushup.mp4",
      defaultDurationSeconds: 30,
      previewDurationSeconds: 5,
      restDurationSeconds: 10
    }
  ],
  weeks: [
    {
      weekNumber: 1,
      days: [
        {
          weekday: "monday",
          activities: [
            {
              name: "Strength",
              sport: "strength",
              exercises: [{ exerciseId: "pushup", rounds: 2 }]
            }
          ]
        }
      ]
    }
  ]
};

describe("parseTrainingPlanJson", () => {
  it("converts a valid import into a strongly typed plan", () => {
    const result = parseTrainingPlanJson(validPlan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.plan.durationDays).toBe(7);
      expect(result.plan.weeks[0]?.days[0]?.activities[0]?.exercises[0]?.rounds).toBe(2);
    }
  });

  it("rejects plans that provide both endDate and durationDays", () => {
    const result = parseTrainingPlanJson({ ...validPlan, endDate: "2026-08-09" });
    expect(result.success).toBe(false);
  });

  it("resolves exercise IDs from an external catalog when the plan omits inline definitions", () => {
    const planWithoutDefinitions = { ...validPlan, exercises: undefined };

    const result = parseTrainingPlanJson(planWithoutDefinitions, undefined, {
      catalog: [
        {
          id: "pushup",
          name: "Catalog push-up",
          sport: "strength",
          muscles: ["chest", "core"],
          description: "Catalog-backed push-up.",
          defaultDurationSeconds: 35,
          previewDurationSeconds: 8,
          restDurationSeconds: 12
        }
      ]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const exercise = result.plan.weeks[0]?.days[0]?.activities[0]?.exercises[0];
      expect(exercise?.catalogId).toBe("pushup");
      expect(exercise?.name).toBe("Catalog push-up");
      expect(exercise?.defaultDurationSeconds).toBe(35);
    }
  });
});
