import { describe, expect, it } from "vitest";
import { markExerciseCompletedInPlans } from "@/features/training/completion";
import type { Plan } from "@/types/domain";

describe("training completion", () => {
  it("marks an exercise complete and completes the activity when all exercises are done", () => {
    const completedAt = "2026-06-20T10:00:00.000Z";
    const result = markExerciseCompletedInPlans([plan], {
      planId: "plan_1",
      activityId: "activity_1",
      exerciseId: "exercise_1",
      completedAt
    });
    const activity = result.plans[0]?.weeks[0]?.days[0]?.activities[0];

    expect(activity?.completedAt).toBe(completedAt);
    expect(activity?.exercises[0]?.completedAt).toBe(completedAt);
    expect(result.completedExercise).toMatchObject({
      exerciseId: "exercise_1",
      activityId: "activity_1",
      planId: "plan_1",
      userId: "anna",
      completedAt
    });
  });

  it("does not change plans when the exercise cannot be found", () => {
    const result = markExerciseCompletedInPlans([plan], {
      planId: "plan_1",
      activityId: "activity_1",
      exerciseId: "missing",
      completedAt: "2026-06-20T10:00:00.000Z"
    });

    expect(result.plans[0]).toBe(plan);
    expect(result.completedExercise).toBeUndefined();
  });
});

const plan: Plan = {
  id: "plan_1",
  userId: "anna",
  title: "Plan",
  startDate: "2026-06-20",
  endDate: "2026-06-26",
  durationDays: 7,
  weeks: [
    {
      id: "week_1",
      planId: "plan_1",
      weekNumber: 1,
      startsOn: "2026-06-20",
      endsOn: "2026-06-26",
      days: [
        {
          id: "day_1",
          planId: "plan_1",
          weekId: "week_1",
          date: "2026-06-20",
          weekday: "saturday",
          activities: [
            {
              id: "activity_1",
              planId: "plan_1",
              dayId: "day_1",
              name: "Strength",
              sport: "strength",
              exercises: [
                {
                  id: "exercise_1",
                  name: "Push-up",
                  sport: "strength",
                  muscles: ["chest"],
                  description: "Push.",
                  media: {},
                  defaultDurationSeconds: 40,
                  previewDurationSeconds: 10,
                  restDurationSeconds: 20,
                  rounds: 1
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  notificationRules: [],
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z",
  syncStatus: "pending"
};
