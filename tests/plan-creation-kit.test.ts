import { describe, expect, it } from "vitest";
import { exerciseCatalog } from "@/exercise-catalog/catalog";
import { createTrainingPlanCreationKit } from "@/features/export/plan-creation-kit";
import { parseTrainingPlanJson } from "@/features/import/training-plan-schema";

describe("training plan creation kit", () => {
  it("bundles LLM instructions, schema, catalog IDs, and a valid example", () => {
    const kit = createTrainingPlanCreationKit(exerciseCatalog);

    expect(kit.restDayRule).toContain("omission");
    expect(kit.llmInstructions.join("\n")).toContain("Provide exactly one of endDate or durationDays");
    expect(kit.exerciseCatalog.map((exercise) => exercise.id)).toContain("easy_run_block");
    expect(kit.schema.required).toContain("weeks");

    const result = parseTrainingPlanJson(kit.examplePlan, undefined, { catalog: exerciseCatalog });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.plan.startDate).toBe("2026-08-03");
      expect(result.plan.weeks[0]?.days).toHaveLength(3);
    }
  });
});
