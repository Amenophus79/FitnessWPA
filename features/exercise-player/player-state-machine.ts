import type { Exercise } from "@/types/domain";

export type PlayerPhase = "preview" | "work" | "rest" | "complete";

export interface PlayerState {
  phase: PlayerPhase;
  exerciseIndex: number;
  round: number;
  remainingSeconds: number;
  completedExerciseIds: string[];
}

export type PlayerEvent =
  | { type: "TICK" }
  | { type: "SKIP" }
  | { type: "MARK_COMPLETED"; exerciseId: string }
  | { type: "RESET" };

export function createInitialPlayerState(exercises: Exercise[]): PlayerState {
  const first = exercises[0];
  return {
    phase: first ? "preview" : "complete",
    exerciseIndex: 0,
    round: 1,
    remainingSeconds: first?.previewDurationSeconds ?? 0,
    completedExerciseIds: []
  };
}

export function transitionPlayerState(state: PlayerState, event: PlayerEvent, exercises: Exercise[]): PlayerState {
  if (event.type === "RESET") {
    return createInitialPlayerState(exercises);
  }

  if (event.type === "MARK_COMPLETED") {
    return {
      ...state,
      completedExerciseIds: state.completedExerciseIds.includes(event.exerciseId)
        ? state.completedExerciseIds
        : [...state.completedExerciseIds, event.exerciseId]
    };
  }

  if (state.phase === "complete") {
    return state;
  }

  if (event.type === "TICK" && state.remainingSeconds > 1) {
    return { ...state, remainingSeconds: state.remainingSeconds - 1 };
  }

  if (event.type === "TICK" || event.type === "SKIP") {
    return advance(state, exercises);
  }

  return state;
}

function advance(state: PlayerState, exercises: Exercise[]): PlayerState {
  const exercise = exercises[state.exerciseIndex];
  if (!exercise) {
    return { ...state, phase: "complete", remainingSeconds: 0 };
  }

  if (state.phase === "preview") {
    return { ...state, phase: "work", remainingSeconds: exercise.defaultDurationSeconds };
  }

  if (state.phase === "work") {
    const completedIds = state.completedExerciseIds.includes(exercise.id)
      ? state.completedExerciseIds
      : [...state.completedExerciseIds, exercise.id];

    if (exercise.restDurationSeconds > 0) {
      return {
        ...state,
        phase: "rest",
        remainingSeconds: exercise.restDurationSeconds,
        completedExerciseIds: completedIds
      };
    }

    return nextExercise({ ...state, completedExerciseIds: completedIds }, exercises);
  }

  return nextExercise(state, exercises);
}

function nextExercise(state: PlayerState, exercises: Exercise[]): PlayerState {
  const exercise = exercises[state.exerciseIndex];
  if (exercise && state.round < exercise.rounds) {
    return {
      ...state,
      phase: "preview",
      round: state.round + 1,
      remainingSeconds: exercise.previewDurationSeconds
    };
  }

  const nextIndex = state.exerciseIndex + 1;
  const next = exercises[nextIndex];

  if (!next) {
    return { ...state, phase: "complete", remainingSeconds: 0 };
  }

  return {
    ...state,
    phase: "preview",
    exerciseIndex: nextIndex,
    round: 1,
    remainingSeconds: next.previewDurationSeconds
  };
}
