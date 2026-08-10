import { describe, expect, it } from "vitest";
import samplePlan from "@/specs/SAMPLE_PLANS/MARATHON_2026_TABATA_START_2026-06-22.json";
import { parseTrainingPlanJson } from "@/features/import/training-plan-schema";

describe("sample plan imports", () => {
  it("imports the original marathon tabata plan starting on Monday 2026-06-22", () => {
    const result = parseTrainingPlanJson(samplePlan);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.errors.join("\n"));
    }

    expect(result.plan.title).toBe("Marathon 2026 + Tabata Strength Support");
    expect(result.plan.startDate).toBe("2026-06-22");
    expect(result.plan.endDate).toBe("2026-09-12");

    const firstDay = result.plan.weeks[0]?.days[0];
    expect(firstDay?.weekday).toBe("monday");
    expect(firstDay?.date).toBe("2026-06-22");
    expect(firstDay?.activities.map((activity) => activity.sport)).toStrictEqual(["running", "tabata"]);
    expect(firstDay?.activities[0]?.exercises[0]?.segments?.some((segment) => segment.repeat && segment.repeat > 1)).toBe(true);

    const raceDay = result.plan.weeks
      .flatMap((week) => week.days)
      .find((day) => day.date === "2026-09-12");

    expect(raceDay?.activities.some((activity) => activity.name === "Marathon race day")).toBe(true);
  });
});
