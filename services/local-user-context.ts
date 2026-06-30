import type { BodyMeasurement, Plan } from "@/types/domain";

export const defaultLocalUserId = "local-user";

export function normalizeLocalUserId(value?: string) {
  return value?.trim() || defaultLocalUserId;
}

export function belongsToLocalUser(recordUserId: string | undefined, activeUserId: string) {
  if (!activeUserId.trim()) {
    return false;
  }

  return normalizeLocalUserId(recordUserId) === normalizeLocalUserId(activeUserId);
}

export function assignPlanToLocalUser(plan: Plan, userId: string): Plan {
  return {
    ...plan,
    userId: normalizeLocalUserId(userId)
  };
}

export function assignMeasurementToLocalUser(measurement: BodyMeasurement, userId: string): BodyMeasurement {
  return {
    ...measurement,
    userId: normalizeLocalUserId(userId)
  };
}

export function assignMissingLocalUserContext({
  plans,
  measurements,
  userId
}: {
  plans: Plan[];
  measurements: BodyMeasurement[];
  userId: string;
}) {
  const normalizedUserId = normalizeLocalUserId(userId);

  return {
    plans: plans.map((plan) => (plan.userId ? plan : assignPlanToLocalUser(plan, normalizedUserId))),
    measurements: measurements.map((measurement) =>
      measurement.userId ? measurement : assignMeasurementToLocalUser(measurement, normalizedUserId)
    )
  };
}

export function getKnownLocalUserIds(plans: Plan[], measurements: BodyMeasurement[]) {
  return [
    ...new Set([
      ...plans.flatMap((plan) => (plan.userId ? [normalizeLocalUserId(plan.userId)] : [])),
      ...measurements.flatMap((measurement) => (measurement.userId ? [normalizeLocalUserId(measurement.userId)] : []))
    ])
  ].sort((a, b) => a.localeCompare(b));
}
