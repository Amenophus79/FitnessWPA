import { describe, expect, it } from "vitest";
import {
  calculateBmi,
  getIsoWeekRange,
  getMeasurementWeekStatus,
  normalizeBodyMeasurement,
  trendFromMeasurements
} from "@/features/body/body-measurements";

describe("body measurements", () => {
  it("calculates BMI from weight and height", () => {
    expect(calculateBmi(80, 180)).toBe(24.7);
  });

  it("normalizes missing BMI and creates sorted trends", () => {
    const normalized = normalizeBodyMeasurement(
      {
        id: "measurement_1",
        measuredAt: "2026-08-10",
        weightKg: 80,
        syncStatus: "pending"
      },
      180
    );

    expect(normalized.bmi).toBe(24.7);
    expect(trendFromMeasurements([normalized], "weightKg")).toEqual([{ date: "2026-08-10", value: 80 }]);
  });

  it("detects whether optional weekly body tracking is open", () => {
    expect(getIsoWeekRange("2026-08-12")).toEqual({
      weekStartsOn: "2026-08-10",
      weekEndsOn: "2026-08-16"
    });

    expect(getMeasurementWeekStatus([], "2026-08-12")).toMatchObject({
      status: "open",
      weekStartsOn: "2026-08-10",
      weekEndsOn: "2026-08-16"
    });

    expect(
      getMeasurementWeekStatus(
        [
          {
            id: "measurement_1",
            measuredAt: "2026-08-10",
            weightKg: 80,
            syncStatus: "pending"
          }
        ],
        "2026-08-12"
      )
    ).toMatchObject({ status: "complete" });
  });
});
