import { describe, expect, it } from "vitest";
import { transitionTrainingNode, type TrainingNode } from "@/features/training/training-state-machine";

describe("training state machine", () => {
  it("moves through plan to exercise phases", () => {
    const plan: TrainingNode = { type: "plan", planId: "plan_1" };
    const week = transitionTrainingNode(plan, { type: "SELECT_WEEK", weekId: "week_1" });
    const day = transitionTrainingNode(week, { type: "SELECT_DAY", dayId: "day_1" });
    const activity = transitionTrainingNode(day, { type: "SELECT_ACTIVITY", activityId: "activity_1" });
    const exercise = transitionTrainingNode(activity, { type: "SELECT_EXERCISE", exerciseId: "exercise_1" });
    const preview = transitionTrainingNode(exercise, { type: "START_PREVIEW" });
    const work = transitionTrainingNode(preview, { type: "START_WORK" });
    const rest = transitionTrainingNode(work, { type: "START_REST" });
    const complete = transitionTrainingNode(rest, { type: "COMPLETE" });

    expect(complete.type).toBe("complete");
  });

  it("rejects invalid transitions", () => {
    expect(() => transitionTrainingNode({ type: "plan", planId: "plan_1" }, { type: "START_WORK" })).toThrow();
  });
});
