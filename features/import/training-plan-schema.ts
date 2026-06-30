import { z } from "zod";
import { exerciseCatalog } from "@/exercise-catalog/catalog";
import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import { mergeExerciseCatalogs } from "@/exercise-catalog/schema";
import { normalizeTrainingPlanInput } from "@/features/import/compact-marathon-tabata-normalizer";
import { dateForWeekday, daysBetween, resolveEndDate } from "@/services/date";
import { createId } from "@/services/id";
import type { Exercise, Plan } from "@/types/domain";
import type { TrainingPlanImport } from "@/types/import";

export const sportSchema = z.enum([
  "running",
  "tabata",
  "strength",
  "mobility",
  "rowing",
  "cycling",
  "swimming",
  "bouldering",
  "rock_climbing",
  "yoga",
  "walking",
  "hiking"
]);

export const weekdaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
]);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates.");
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm time.");

const exerciseDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sport: sportSchema,
  muscles: z.array(z.string().min(1)),
  description: z.string().min(1),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  defaultDurationSeconds: z.number().int().positive(),
  previewDurationSeconds: z.number().int().nonnegative(),
  restDurationSeconds: z.number().int().nonnegative().optional()
});

const notificationRuleSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["daily", "weekday", "rest_period", "sport_specific"]),
  label: z.string().min(1),
  enabled: z.boolean(),
  time: timeSchema,
  weekdays: z.array(weekdaySchema).optional(),
  sports: z.array(sportSchema).optional(),
  message: z.string().min(1),
  leadTimeMinutes: z.number().int().nonnegative().optional()
});

const importedActivityExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  rounds: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  restSeconds: z.number().int().nonnegative().optional()
});

const importedActivitySchema = z.object({
  name: z.string().min(1),
  sport: sportSchema,
  intensity: z.enum(["recovery", "easy", "moderate", "threshold", "hard", "race"]).optional(),
  notes: z.string().optional(),
  plannedDurationMinutes: z.number().int().positive().optional(),
  plannedDistanceKm: z.number().positive().optional(),
  exercises: z.array(importedActivityExerciseSchema).min(1)
});

const importedDaySchema = z.object({
  weekday: weekdaySchema,
  date: isoDateSchema.optional(),
  activities: z.array(importedActivitySchema).min(1)
});

const importedWeekSchema = z.object({
  weekNumber: z.number().int().positive(),
  days: z.array(importedDaySchema).min(1)
});

const bodyMeasurementSchema = z.object({
  userId: z.string().optional(),
  measuredAt: isoDateSchema,
  weightKg: z.number().positive().optional(),
  bmi: z.number().positive().optional(),
  bodyFatPercent: z.number().min(0).max(100).optional(),
  waistCm: z.number().positive().optional(),
  hipCm: z.number().positive().optional(),
  chestCm: z.number().positive().optional(),
  armCm: z.number().positive().optional(),
  thighCm: z.number().positive().optional(),
  restingHeartRate: z.number().int().positive().optional(),
  vo2Max: z.number().positive().optional()
});

export const trainingPlanImportSchema = z
  .object({
    version: z.literal("1.0"),
    title: z.string().min(1),
    description: z.string().optional(),
    startDate: isoDateSchema,
    endDate: isoDateSchema.optional(),
    durationDays: z.number().int().positive().optional(),
    timezone: z.string().optional(),
    exercises: z.array(exerciseDefinitionSchema).optional(),
    exerciseCatalog: z.array(exerciseDefinitionSchema).optional(),
    weeks: z.array(importedWeekSchema).min(1),
    notificationRules: z.array(notificationRuleSchema).optional(),
    bodyMeasurements: z.array(bodyMeasurementSchema).optional()
  })
  .refine((value) => Boolean(value.endDate) !== Boolean(value.durationDays), {
    message: "Provide either endDate or durationDays, but not both."
  });

export type TrainingPlanImportInput = z.infer<typeof trainingPlanImportSchema>;

export interface ParseTrainingPlanOptions {
  catalog?: ExerciseCatalogItem[];
}

export type PlanImportResult =
  | { success: true; plan: Plan; source: TrainingPlanImport }
  | { success: false; errors: string[] };

export function parseTrainingPlanJson(input: unknown, userId?: string, options: ParseTrainingPlanOptions = {}): PlanImportResult {
  const normalizedInput = normalizeTrainingPlanInput(input);
  const parsed = trainingPlanImportSchema.safeParse(normalizedInput);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    };
  }

  try {
    return { success: true, plan: toPlan(parsed.data, userId, options), source: parsed.data };
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : "Unknown import error."] };
  }
}

export function toPlan(source: TrainingPlanImport, userId?: string, options: ParseTrainingPlanOptions = {}): Plan {
  const planId = createId("plan");
  const endDate = resolveEndDate(source.startDate, source.endDate, source.durationDays);
  const mergedCatalog = mergeExerciseCatalogs(
    exerciseCatalog,
    options.catalog ?? [],
    source.exerciseCatalog ?? [],
    source.exercises ?? []
  );
  const exerciseMap = new Map(mergedCatalog.map((exercise) => [exercise.id, exercise]));
  const now = new Date().toISOString();

  const weeks = source.weeks.map((week) => {
    const weekId = createId("week");
    const weekDates = week.days.map((day) => day.date ?? dateForWeekday(source.startDate, week.weekNumber, day.weekday));
    const startsOn = weekDates.length > 0 ? [...weekDates].sort()[0] : dateForWeekday(source.startDate, week.weekNumber, "monday");
    const endsOn = weekDates.length > 0 ? [...weekDates].sort().at(-1) ?? startsOn : dateForWeekday(source.startDate, week.weekNumber, "sunday");

    return {
      id: weekId,
      planId,
      weekNumber: week.weekNumber,
      startsOn,
      endsOn,
      days: week.days.map((day) => {
        const dayId = createId("day");
        const date = day.date ?? dateForWeekday(source.startDate, week.weekNumber, day.weekday);

        return {
          id: dayId,
          planId,
          weekId,
          date,
          weekday: day.weekday,
          activities: day.activities.map((activity) => ({
            id: createId("activity"),
            planId,
            dayId,
            name: activity.name,
            sport: activity.sport,
            intensity: activity.intensity,
            notes: activity.notes,
            plannedDurationMinutes: activity.plannedDurationMinutes,
            plannedDistanceKm: activity.plannedDistanceKm,
            exercises: activity.exercises.map((activityExercise): Exercise => {
              const definition = exerciseMap.get(activityExercise.exerciseId);
              if (!definition) {
                throw new Error(`Unknown exercise definition: ${activityExercise.exerciseId}`);
              }

              return {
                id: createId("exercise"),
                catalogId: definition.id,
                name: definition.name,
                sport: definition.sport,
                muscles: definition.muscles,
                description: definition.description,
                media: {
                  imageUrl: definition.imageUrl,
                  videoUrl: definition.videoUrl
                },
                defaultDurationSeconds: activityExercise.durationSeconds ?? definition.defaultDurationSeconds,
                previewDurationSeconds: definition.previewDurationSeconds,
                restDurationSeconds: activityExercise.restSeconds ?? definition.restDurationSeconds ?? 0,
                rounds: activityExercise.rounds ?? 1
              };
            })
          }))
        };
      })
    };
  });

  return {
    id: planId,
    userId,
    title: source.title,
    description: source.description,
    startDate: source.startDate,
    endDate,
    durationDays: daysBetween(source.startDate, endDate) + 1,
    weeks,
    notificationRules: source.notificationRules ?? [],
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending"
  };
}
