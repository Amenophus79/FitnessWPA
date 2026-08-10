import { describe, expect, it } from "vitest";
import { parseTrainingPlanJson } from "@/features/import/training-plan-schema";
import { marathonTabataStartPlanInput } from "@/features/seed/marathon-tabata-start-plan";

describe("compact marathon tabata normalizer", () => {
  it("expands the compact marathon + tabata plan into the standard import schema", () => {
    const result = parseTrainingPlanJson(marathonTabataStartPlanInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.plan.title).toBe("Marathon 2026 + Tabata Strength Support");
      expect(result.plan.startDate).toBe("2026-06-17");
      expect(result.plan.endDate).toBe("2026-09-12");

      const firstDay = result.plan.weeks[0]?.days[0];
      expect(firstDay?.date).toBe("2026-06-17");
      expect(firstDay?.activities.map((activity) => activity.sport)).toEqual(["running", "tabata"]);

      const firstTabata = firstDay?.activities.find((activity) => activity.sport === "tabata");
      expect(firstTabata?.exercises).toHaveLength(32);
      expect(firstTabata?.exercises[0]?.catalogId).toBe("push_up");
      expect(firstTabata?.exercises[1]?.catalogId).toBe("plank");

      const intervalRun = result.plan.weeks
        .flatMap((week) => week.days)
        .flatMap((day) => day.activities)
        .find((activity) => activity.name === "Interval / sprint run");
      const intervalMainSet = intervalRun?.exercises[0]?.segments?.find((segment) => segment.repeat);
      expect(intervalMainSet?.repeat).toBeGreaterThan(1);
      expect(intervalMainSet?.segments?.map((segment) => segment.kind)).toEqual(["work", "recovery"]);

      const easyRun = result.plan.weeks
        .flatMap((week) => week.days)
        .flatMap((day) => day.activities)
        .find((activity) => activity.name === "Easy run");
      expect(easyRun?.exercises[0]?.segments?.[0]).toMatchObject({
        kind: "warmup",
        name: "Ease into pace"
      });

      const taperWeek = result.plan.weeks.find((week) => week.days.some((day) => day.date === "2026-09-11"));
      const taperFriday = taperWeek?.days.find((day) => day.date === "2026-09-11");
      expect(taperFriday?.activities.some((activity) => activity.sport === "tabata")).toBe(false);

      const raceDay = result.plan.weeks.flatMap((week) => week.days).find((day) => day.date === "2026-09-12");
      expect(raceDay?.activities[0]?.name).toBe("Marathon race day");
    }
  });
});
