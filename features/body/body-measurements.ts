import type { BodyMeasurement, TrendPoint } from "@/types/domain";

export interface MeasurementWeekStatus {
  status: "complete" | "open";
  weekStartsOn: string;
  weekEndsOn: string;
  measurement?: BodyMeasurement;
}

export function calculateBmi(weightKg: number, heightCm: number) {
  const heightMeters = heightCm / 100;
  return roundOne(weightKg / (heightMeters * heightMeters));
}

export function normalizeBodyMeasurement(
  measurement: BodyMeasurement,
  heightCm?: number
): BodyMeasurement {
  if (!measurement.bmi && measurement.weightKg && heightCm) {
    return { ...measurement, bmi: calculateBmi(measurement.weightKg, heightCm) };
  }

  return measurement;
}

export function trendFromMeasurements(
  measurements: BodyMeasurement[],
  field: keyof Pick<BodyMeasurement, "weightKg" | "bmi" | "bodyFatPercent">
): TrendPoint[] {
  return measurements
    .filter((measurement) => typeof measurement[field] === "number")
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((measurement) => ({
      date: measurement.measuredAt,
      value: Number(measurement[field])
    }));
}

export function getMeasurementWeekStatus(
  measurements: BodyMeasurement[],
  referenceDate = new Date().toISOString().slice(0, 10)
): MeasurementWeekStatus {
  const { weekStartsOn, weekEndsOn } = getIsoWeekRange(referenceDate);
  const measurement = measurements.find(
    (item) => item.measuredAt >= weekStartsOn && item.measuredAt <= weekEndsOn
  );

  return {
    status: measurement ? "complete" : "open",
    weekStartsOn,
    weekEndsOn,
    measurement
  };
}

export function getIsoWeekRange(date: string) {
  const cursor = new Date(`${date}T00:00:00.000Z`);
  const day = cursor.getUTCDay() || 7;
  cursor.setUTCDate(cursor.getUTCDate() - day + 1);
  const weekStartsOn = cursor.toISOString().slice(0, 10);
  cursor.setUTCDate(cursor.getUTCDate() + 6);
  const weekEndsOn = cursor.toISOString().slice(0, 10);

  return { weekStartsOn, weekEndsOn };
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
