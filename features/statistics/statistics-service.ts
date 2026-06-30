import { trendFromMeasurements } from "@/features/body/body-measurements";
import type { Activity, BodyMeasurement, Plan, Statistics } from "@/types/domain";

export function calculateStatistics(plans: Plan[], measurements: BodyMeasurement[], now = new Date()): Statistics {
  const activities = plans.flatMap((plan) =>
    plan.weeks.flatMap((week) => week.days.flatMap((day) => day.activities.map((activity) => ({ ...activity, date: day.date }))))
  );

  const completedActivities = activities.filter((activity) => activity.completedAt);
  const completedExercises = activities.flatMap((activity) =>
    activity.exercises.filter((exercise) => exercise.completedAt).map((exercise) => ({ activity, exercise }))
  );
  const allExercises = activities.flatMap((activity) => activity.exercises);

  return {
    trainingStreakDays: calculateTrainingStreak(completedActivities, now),
    weeklyVolumeMinutes: calculateWeeklyVolume(completedActivities, now),
    runningDistanceKm: sumDistance(completedActivities, "running"),
    rowingDistanceKm: sumDistance(completedActivities, "rowing"),
    exerciseCompletionRate: allExercises.length ? completedExercises.length / allExercises.length : 0,
    weightTrend: trendFromMeasurements(measurements, "weightKg"),
    bmiTrend: trendFromMeasurements(measurements, "bmi"),
    bodyFatTrend: trendFromMeasurements(measurements, "bodyFatPercent")
  };
}

function calculateTrainingStreak(activities: Array<Activity & { date: string }>, now: Date) {
  const completedDates = new Set(activities.map((activity) => activity.completedAt?.slice(0, 10) ?? activity.date));
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let streak = 0;

  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function calculateWeeklyVolume(activities: Array<Activity & { date: string }>, now: Date) {
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = cursor.getUTCDay() || 7;
  cursor.setUTCDate(cursor.getUTCDate() - day + 1);
  const weekStart = cursor.toISOString().slice(0, 10);

  return activities
    .filter((activity) => activity.date >= weekStart)
    .reduce((total, activity) => total + (activity.plannedDurationMinutes ?? 0), 0);
}

function sumDistance(activities: Array<Activity & { date: string }>, sport: Activity["sport"]) {
  return activities
    .filter((activity) => activity.sport === sport)
    .reduce((total, activity) => total + (activity.plannedDistanceKm ?? 0), 0);
}
