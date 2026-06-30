import type { CompletedExercise, Plan } from "@/types/domain";

export interface CompleteExerciseInput {
  planId: string;
  activityId: string;
  exerciseId: string;
  completedAt: string;
}

export function markExerciseCompletedInPlans(plans: Plan[], input: CompleteExerciseInput) {
  let completedExercise: CompletedExercise | undefined;

  const nextPlans = plans.map((plan) => {
    if (plan.id !== input.planId) {
      return plan;
    }

    let planChanged = false;

    const weeks = plan.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        activities: day.activities.map((activity) => {
          if (activity.id !== input.activityId) {
            return activity;
          }

          const exercises = activity.exercises.map((exercise) => {
            if (exercise.id !== input.exerciseId) {
              return exercise;
            }

            planChanged = true;
            completedExercise = {
              exerciseId: exercise.id,
              activityId: activity.id,
              planId: plan.id,
              userId: plan.userId,
              completedAt: input.completedAt
            };

            return {
              ...exercise,
              completedAt: input.completedAt
            };
          });

          const activityCompletedAt =
            exercises.length > 0 && exercises.every((exercise) => exercise.completedAt)
              ? activity.completedAt ?? input.completedAt
              : activity.completedAt;

          return {
            ...activity,
            completedAt: activityCompletedAt,
            exercises
          };
        })
      }))
    }));

    return planChanged
      ? {
          ...plan,
          weeks,
          updatedAt: input.completedAt,
          syncStatus: "pending" as const
        }
      : plan;
  });

  return { plans: nextPlans, completedExercise };
}
