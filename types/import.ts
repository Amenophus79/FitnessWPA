import type {
  ActivityIntensity,
  BodyMeasurement,
  ExerciseSegmentKind,
  NotificationRule,
  Sport,
  Weekday
} from "@/types/domain";

export interface TrainingPlanImport {
  version: "1.0";
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  durationDays?: number;
  timezone?: string;
  exercises?: ImportedExerciseDefinition[];
  exerciseCatalog?: ImportedExerciseDefinition[];
  weeks: ImportedWeek[];
  notificationRules?: NotificationRule[];
  bodyMeasurements?: Omit<BodyMeasurement, "id" | "syncStatus">[];
}

export interface ImportedExerciseDefinition {
  id: string;
  name: string;
  sport: Sport;
  muscles: string[];
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  defaultDurationSeconds: number;
  previewDurationSeconds: number;
  restDurationSeconds?: number;
}

export interface ImportedWeek {
  weekNumber: number;
  days: ImportedDay[];
}

export interface ImportedDay {
  weekday: Weekday;
  date?: string;
  activities: ImportedActivity[];
}

export interface ImportedActivity {
  name: string;
  sport: Sport;
  intensity?: ActivityIntensity;
  notes?: string;
  plannedDurationMinutes?: number;
  plannedDistanceKm?: number;
  exercises: ImportedActivityExercise[];
}

export interface ImportedActivityExercise {
  exerciseId: string;
  rounds?: number;
  durationSeconds?: number;
  restSeconds?: number;
  segments?: ImportedExerciseSegment[];
}

export interface ImportedExerciseSegment {
  id?: string;
  name: string;
  kind?: ExerciseSegmentKind;
  durationSeconds?: number;
  distanceKm?: number;
  targetPace?: string;
  targetSpeedKmh?: number;
  intensity?: ActivityIntensity;
  notes?: string;
  repeat?: number;
  segments?: ImportedExerciseSegment[];
}
