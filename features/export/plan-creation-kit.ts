import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import { trainingPlanJsonSchema } from "@/openai/training-plan-json-schema";
import { supportedSports } from "@/types/sports";

export interface TrainingPlanCreationKit {
  exportedAt: string;
  version: "1.0";
  purpose: string;
  llmInstructions: string[];
  validationRules: string[];
  restDayRule: string;
  schema: typeof trainingPlanJsonSchema;
  exerciseCatalog: TrainingPlanCreationKitExercise[];
  examplePlan: TrainingPlanCreationKitExamplePlan;
}

export interface TrainingPlanCreationKitExercise {
  id: string;
  name: string;
  sport: ExerciseCatalogItem["sport"];
  muscles: string[];
  description: string;
  defaultDurationSeconds: number;
  previewDurationSeconds: number;
  restDurationSeconds: number;
}

export type TrainingPlanCreationKitExamplePlan = {
  version: "1.0";
  title: string;
  description: string;
  startDate: string;
  durationDays: number;
  weeks: Array<{
    weekNumber: number;
    days: Array<{
      weekday: string;
      date: string;
      activities: Array<{
        name: string;
        sport: string;
        intensity: string;
        notes: string;
        plannedDurationMinutes: number;
        plannedDistanceKm?: number;
        exercises: Array<{
          exerciseId: string;
          rounds?: number;
          durationSeconds?: number;
          restSeconds?: number;
        }>;
      }>;
    }>;
  }>;
  notificationRules: Array<{
    id: string;
    kind: string;
    label: string;
    enabled: boolean;
    time: string;
    sports?: string[];
    weekdays?: string[];
    message: string;
    leadTimeMinutes?: number;
  }>;
};

export function createTrainingPlanCreationKit(catalog: ExerciseCatalogItem[]): TrainingPlanCreationKit {
  return {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    purpose: "Use this kit to create JSON training plans that can be imported into FitnessPWA.",
    llmInstructions: [
      "Return only the training plan JSON object when creating a plan; do not return this kit, markdown, comments, or code fences.",
      "Use version \"1.0\" and YYYY-MM-DD dates.",
      "Provide exactly one of endDate or durationDays.",
      "Prefer exerciseId values from exerciseCatalog. If a needed exercise is missing, define it under root exercises or root exerciseCatalog and then reference that new id.",
      "Create multiple activities on the same day when different training types happen in the same session window, for example running plus mobility.",
      "Only include week day entries for dates that have planned activities.",
      "Keep weekday and date consistent when both are present.",
      "Use supported sports only: " + supportedSports.join(", ") + "."
    ],
    validationRules: [
      "weeks must contain at least one week.",
      "Each day entry must contain at least one activity.",
      "Each activity must contain at least one exercise.",
      "Every activity exerciseId must resolve to an id in exerciseCatalog, root exercises, or root exerciseCatalog.",
      "Activities may include plannedDurationMinutes and plannedDistanceKm when useful.",
      "Notification times use HH:mm format."
    ],
    restDayRule: "Rest days are represented by omission. Do not create a day entry for a date that should be a rest day.",
    schema: trainingPlanJsonSchema,
    exerciseCatalog: catalog.map(toKitExercise),
    examplePlan
  };
}

export function stringifyTrainingPlanCreationKit(kit: TrainingPlanCreationKit) {
  return JSON.stringify(kit, null, 2);
}

function toKitExercise(exercise: ExerciseCatalogItem): TrainingPlanCreationKitExercise {
  return {
    id: exercise.id,
    name: exercise.name,
    sport: exercise.sport,
    muscles: exercise.muscles,
    description: exercise.description,
    defaultDurationSeconds: exercise.defaultDurationSeconds,
    previewDurationSeconds: exercise.previewDurationSeconds,
    restDurationSeconds: exercise.restDurationSeconds ?? 0
  };
}

export const examplePlan: TrainingPlanCreationKitExamplePlan = {
  version: "1.0",
  title: "Example running and strength week",
  description: "Example import using catalog exercise IDs. Tuesday, Thursday, Saturday, and Sunday are rest days because they are omitted.",
  startDate: "2026-08-03",
  durationDays: 7,
  weeks: [
    {
      weekNumber: 1,
      days: [
        {
          weekday: "monday",
          date: "2026-08-03",
          activities: [
            {
              name: "Easy run",
              sport: "running",
              intensity: "easy",
              notes: "Conversational pace.",
              plannedDurationMinutes: 45,
              plannedDistanceKm: 8,
              exercises: [{ exerciseId: "easy_run_block", rounds: 1 }]
            }
          ]
        },
        {
          weekday: "wednesday",
          date: "2026-08-05",
          activities: [
            {
              name: "Runner strength",
              sport: "tabata",
              intensity: "moderate",
              notes: "Controlled form, stop before fatigue breaks mechanics.",
              plannedDurationMinutes: 16,
              exercises: [
                { exerciseId: "bodyweight_squat", rounds: 4 },
                { exerciseId: "glute_bridge", rounds: 4 }
              ]
            }
          ]
        },
        {
          weekday: "friday",
          date: "2026-08-07",
          activities: [
            {
              name: "Progressive long run",
              sport: "running",
              intensity: "moderate",
              notes: "Start easy and finish steady.",
              plannedDurationMinutes: 95,
              plannedDistanceKm: 17,
              exercises: [{ exerciseId: "progressive_long_run", rounds: 1 }]
            }
          ]
        }
      ]
    }
  ],
  notificationRules: [
    {
      id: "run_reminder",
      kind: "sport_specific",
      label: "Run reminder",
      enabled: true,
      time: "06:30",
      sports: ["running"],
      message: "{activity} starts soon.",
      leadTimeMinutes: 15
    }
  ]
};
