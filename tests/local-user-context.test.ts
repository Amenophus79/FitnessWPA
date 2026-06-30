import { describe, expect, it } from "vitest";
import {
  assignMeasurementToLocalUser,
  assignMissingLocalUserContext,
  assignPlanToLocalUser,
  belongsToLocalUser,
  defaultLocalUserId,
  getKnownLocalUserIds,
  normalizeLocalUserId
} from "@/services/local-user-context";
import type { BodyMeasurement, Plan } from "@/types/domain";

describe("local user context", () => {
  it("normalizes empty local user IDs to the default context", () => {
    expect(normalizeLocalUserId()).toBe(defaultLocalUserId);
    expect(normalizeLocalUserId("")).toBe(defaultLocalUserId);
    expect(normalizeLocalUserId(" anna ")).toBe("anna");
  });

  it("treats legacy records without userId as default local user records", () => {
    expect(belongsToLocalUser(undefined, "")).toBe(false);
    expect(belongsToLocalUser(undefined, defaultLocalUserId)).toBe(true);
    expect(belongsToLocalUser(undefined, "child")).toBe(false);
    expect(belongsToLocalUser("child", "child")).toBe(true);
  });

  it("assigns plans and measurements to the active local user", () => {
    expect(assignPlanToLocalUser(plan, "adult").userId).toBe("adult");
    expect(assignMeasurementToLocalUser(measurement, "child").userId).toBe("child");
  });

  it("migrates only records without a user context", () => {
    const migrated = assignMissingLocalUserContext({
      plans: [plan, { ...plan, id: "plan_existing", userId: "adult" }],
      measurements: [measurement, { ...measurement, id: "measurement_existing", userId: "adult" }],
      userId: "child"
    });

    expect(migrated.plans.map((item) => item.userId)).toStrictEqual(["child", "adult"]);
    expect(migrated.measurements.map((item) => item.userId)).toStrictEqual(["child", "adult"]);
  });

  it("derives known local users from user-owned records", () => {
    expect(
      getKnownLocalUserIds(
        [assignPlanToLocalUser(plan, "adult")],
        [assignMeasurementToLocalUser(measurement, "child")]
      )
    ).toStrictEqual(["adult", "child"]);
  });
});

const plan: Plan = {
  id: "plan_1",
  title: "Plan",
  startDate: "2026-08-03",
  endDate: "2026-08-09",
  durationDays: 7,
  weeks: [],
  notificationRules: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  syncStatus: "pending"
};

const measurement: BodyMeasurement = {
  id: "measurement_1",
  measuredAt: "2026-08-03",
  weightKg: 77,
  syncStatus: "pending"
};
