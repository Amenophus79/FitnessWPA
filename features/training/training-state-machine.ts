export type TrainingNode =
  | { type: "plan"; planId: string }
  | { type: "week"; planId: string; weekId: string }
  | { type: "day"; planId: string; weekId: string; dayId: string }
  | { type: "activity"; planId: string; weekId: string; dayId: string; activityId: string }
  | {
      type: "exercise";
      planId: string;
      weekId: string;
      dayId: string;
      activityId: string;
      exerciseId: string;
    }
  | {
      type: "preview" | "work" | "rest";
      planId: string;
      weekId: string;
      dayId: string;
      activityId: string;
      exerciseId: string;
    }
  | { type: "complete"; planId: string; weekId: string; dayId: string; activityId?: string; exerciseId?: string };

export type TrainingEvent =
  | { type: "SELECT_WEEK"; weekId: string }
  | { type: "SELECT_DAY"; dayId: string }
  | { type: "SELECT_ACTIVITY"; activityId: string }
  | { type: "SELECT_EXERCISE"; exerciseId: string }
  | { type: "START_PREVIEW" }
  | { type: "START_WORK" }
  | { type: "START_REST" }
  | { type: "COMPLETE" };

export function transitionTrainingNode(state: TrainingNode, event: TrainingEvent): TrainingNode {
  switch (event.type) {
    case "SELECT_WEEK":
      requireNode(state, "plan");
      return { type: "week", planId: state.planId, weekId: event.weekId };
    case "SELECT_DAY":
      requireNode(state, "week");
      return { type: "day", planId: state.planId, weekId: state.weekId, dayId: event.dayId };
    case "SELECT_ACTIVITY":
      requireNode(state, "day");
      return {
        type: "activity",
        planId: state.planId,
        weekId: state.weekId,
        dayId: state.dayId,
        activityId: event.activityId
      };
    case "SELECT_EXERCISE":
      requireNode(state, "activity");
      return {
        type: "exercise",
        planId: state.planId,
        weekId: state.weekId,
        dayId: state.dayId,
        activityId: state.activityId,
        exerciseId: event.exerciseId
      };
    case "START_PREVIEW":
      requireNode(state, "exercise");
      return toExercisePhase("preview", state);
    case "START_WORK":
      requireNode(state, "preview");
      return toExercisePhase("work", state);
    case "START_REST":
      requireNode(state, "work");
      return toExercisePhase("rest", state);
    case "COMPLETE":
      if (state.type === "rest" || state.type === "work" || state.type === "activity") {
        return {
          type: "complete",
          planId: state.planId,
          weekId: state.weekId,
          dayId: state.dayId,
          activityId: state.activityId,
          exerciseId: "exerciseId" in state ? state.exerciseId : undefined
        };
      }
      throw new Error(`Cannot complete from ${state.type}.`);
    default:
      return state;
  }
}

function toExercisePhase(type: "preview" | "work" | "rest", state: Extract<TrainingNode, { type: "exercise" | "preview" | "work" }>): TrainingNode {
  return {
    type,
    planId: state.planId,
    weekId: state.weekId,
    dayId: state.dayId,
    activityId: state.activityId,
    exerciseId: state.exerciseId
  };
}

function requireNode<T extends TrainingNode["type"]>(state: TrainingNode, type: T): asserts state is Extract<TrainingNode, { type: T }> {
  if (state.type !== type) {
    throw new Error(`Expected ${type} state, received ${state.type}.`);
  }
}
