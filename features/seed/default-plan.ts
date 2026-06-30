import { parseTrainingPlanJson } from "@/features/import/training-plan-schema";
import { marathonTabataStartPlanInput } from "@/features/seed/marathon-tabata-start-plan";
import type { BodyMeasurement, Plan } from "@/types/domain";

export const demoMeasurements: BodyMeasurement[] = [];
export const demoPlan: Plan = createDemoPlan();

function createDemoPlan() {
  const result = parseTrainingPlanJson(marathonTabataStartPlanInput);

  if (!result.success) {
    throw new Error(`Seed plan is invalid: ${result.errors.join("; ")}`);
  }

  return result.plan;
}
