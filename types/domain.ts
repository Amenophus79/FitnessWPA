export type Role = "admin" | "adult" | "child";

export type Sport =
  | "running"
  | "tabata"
  | "strength"
  | "mobility"
  | "rowing"
  | "cycling"
  | "swimming"
  | "bouldering"
  | "rock_climbing"
  | "yoga"
  | "walking"
  | "hiking";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type ActivityIntensity = "recovery" | "easy" | "moderate" | "threshold" | "hard" | "race";
export type ExerciseSegmentKind = "warmup" | "work" | "recovery" | "rest" | "cooldown" | "instruction";
export type NotificationKind = "daily" | "weekday" | "rest_period" | "sport_specific";
export type SyncStatus = "pending" | "synced" | "conflict";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  pinHash?: string;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  weeks: Week[];
  notificationRules: NotificationRule[];
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface Week {
  id: string;
  planId: string;
  weekNumber: number;
  startsOn: string;
  endsOn: string;
  days: Day[];
}

export interface Day {
  id: string;
  planId: string;
  weekId: string;
  date: string;
  weekday: Weekday;
  activities: Activity[];
}

export interface Activity {
  id: string;
  planId: string;
  dayId: string;
  name: string;
  sport: Sport;
  intensity?: ActivityIntensity;
  notes?: string;
  plannedDurationMinutes?: number;
  plannedDistanceKm?: number;
  exercises: Exercise[];
  completedAt?: string;
}

export interface Exercise {
  id: string;
  catalogId?: string;
  name: string;
  sport: Sport;
  muscles: string[];
  description: string;
  media: ExerciseMedia;
  defaultDurationSeconds: number;
  previewDurationSeconds: number;
  restDurationSeconds: number;
  rounds: number;
  segments?: ExerciseSegment[];
  completedAt?: string;
}

export interface ExerciseSegment {
  id: string;
  name: string;
  kind?: ExerciseSegmentKind;
  durationSeconds?: number;
  distanceKm?: number;
  targetPace?: string;
  targetSpeedKmh?: number;
  intensity?: ActivityIntensity;
  notes?: string;
  repeat?: number;
  segments?: ExerciseSegment[];
}

export interface ExerciseMedia {
  imageUrl?: string;
  videoUrl?: string;
}

export interface BodyMeasurement {
  id: string;
  userId?: string;
  measuredAt: string;
  weightKg?: number;
  bmi?: number;
  bodyFatPercent?: number;
  waistCm?: number;
  hipCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  restingHeartRate?: number;
  vo2Max?: number;
  syncStatus: SyncStatus;
}

export interface NotificationRule {
  id: string;
  kind: NotificationKind;
  label: string;
  enabled: boolean;
  time: string;
  weekdays?: Weekday[];
  sports?: Sport[];
  message: string;
  leadTimeMinutes?: number;
}

export interface Statistics {
  trainingStreakDays: number;
  weeklyVolumeMinutes: number;
  runningDistanceKm: number;
  rowingDistanceKm: number;
  exerciseCompletionRate: number;
  weightTrend: TrendPoint[];
  bmiTrend: TrendPoint[];
  bodyFatTrend: TrendPoint[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface CompletedExercise {
  exerciseId: string;
  activityId: string;
  planId?: string;
  userId?: string;
  completedAt: string;
}
