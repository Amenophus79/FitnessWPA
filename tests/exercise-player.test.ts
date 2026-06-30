import { describe, expect, it } from "vitest";
import {
  createInitialPlayerState,
  transitionPlayerState
} from "@/features/exercise-player/player-state-machine";
import type { Exercise } from "@/types/domain";

const exercises: Exercise[] = [
  {
    id: "exercise_1",
    name: "Burpee",
    sport: "tabata",
    muscles: ["full_body"],
    description: "Conditioning",
    media: {},
    defaultDurationSeconds: 20,
    previewDurationSeconds: 2,
    restDurationSeconds: 1,
    rounds: 1
  }
];

describe("exercise player state machine", () => {
  it("moves preview to work to rest to complete", () => {
    const initial = createInitialPlayerState(exercises);
    const work = transitionPlayerState(initial, { type: "SKIP" }, exercises);
    const rest = transitionPlayerState(work, { type: "SKIP" }, exercises);
    const complete = transitionPlayerState(rest, { type: "SKIP" }, exercises);

    expect(work.phase).toBe("work");
    expect(rest.phase).toBe("rest");
    expect(complete.phase).toBe("complete");
    expect(rest.completedExerciseIds).toContain("exercise_1");
  });
});
