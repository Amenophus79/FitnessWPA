# State Machine Specification

## Purpose

The application uses strongly typed state machines for predictable training flow. State transitions should be explicit, testable, and safe to persist.

Relevant files:

```text
features/exercise-player/player-state-machine.ts
features/training/training-state-machine.ts
tests/exercise-player.test.ts
tests/training-state-machine.test.ts
```

## Exercise Player Machine

The exercise player controls countdown phases inside an activity.

Flow:

```text
Preview -> Work -> Rest -> Preview Next Round/Exercise -> Complete
```

State:

```ts
interface PlayerState {
  phase: "preview" | "work" | "rest" | "complete";
  exerciseIndex: number;
  round: number;
  remainingSeconds: number;
  completedExerciseIds: string[];
}
```

Events:

```ts
type PlayerEvent =
  | { type: "TICK" }
  | { type: "SKIP" }
  | { type: "MARK_COMPLETED"; exerciseId: string }
  | { type: "RESET" };
```

### Transition Rules

| Current phase | Event | Next state |
| --- | --- | --- |
| `preview` | `TICK` with remaining time | `preview` with decremented time |
| `preview` | `TICK` at zero or `SKIP` | `work` |
| `work` | `TICK` with remaining time | `work` with decremented time |
| `work` | `TICK` at zero or `SKIP` | `rest` when rest exists, otherwise next exercise |
| `rest` | `TICK` with remaining time | `rest` with decremented time |
| `rest` | `TICK` at zero or `SKIP` | next round, next exercise, or `complete` |
| any active phase | `MARK_COMPLETED` | same phase with completed ID stored |
| any phase | `RESET` | initial player state |
| `complete` | any non-reset event | `complete` |

### Timing Rules

- `previewDurationSeconds` controls the setup countdown.
- `defaultDurationSeconds` controls work time.
- `restDurationSeconds` controls rest after work.
- `rounds` repeats the same exercise before moving to the next exercise.
- Tabata defaults should use `20` seconds work and `10` seconds rest.

### Completion Rules

An exercise is considered completed when:

- work ends naturally,
- work is skipped into rest,
- or the user explicitly marks it completed.

Completion is represented by local exercise IDs in `completedExerciseIds`. Persistent completion records use:

```ts
interface CompletedExercise {
  exerciseId: string;
  activityId: string;
  completedAt: string;
}
```

## Training Navigation Machine

The training navigation machine models the hierarchy from plan to completed exercise flow.

Flow:

```text
Plan -> Week -> Day -> Activity -> Exercise -> Preview -> Work -> Rest -> Complete
```

State union:

```ts
type TrainingNode =
  | { type: "plan"; planId: string }
  | { type: "week"; planId: string; weekId: string }
  | { type: "day"; planId: string; weekId: string; dayId: string }
  | { type: "activity"; planId: string; weekId: string; dayId: string; activityId: string }
  | { type: "exercise"; planId: string; weekId: string; dayId: string; activityId: string; exerciseId: string }
  | { type: "preview" | "work" | "rest"; planId: string; weekId: string; dayId: string; activityId: string; exerciseId: string }
  | { type: "complete"; planId: string; weekId: string; dayId: string; activityId?: string; exerciseId?: string };
```

Events:

```ts
type TrainingEvent =
  | { type: "SELECT_WEEK"; weekId: string }
  | { type: "SELECT_DAY"; dayId: string }
  | { type: "SELECT_ACTIVITY"; activityId: string }
  | { type: "SELECT_EXERCISE"; exerciseId: string }
  | { type: "START_PREVIEW" }
  | { type: "START_WORK" }
  | { type: "START_REST" }
  | { type: "COMPLETE" };
```

### Valid Transition Table

| Current node | Event | Next node |
| --- | --- | --- |
| `plan` | `SELECT_WEEK` | `week` |
| `week` | `SELECT_DAY` | `day` |
| `day` | `SELECT_ACTIVITY` | `activity` |
| `activity` | `SELECT_EXERCISE` | `exercise` |
| `exercise` | `START_PREVIEW` | `preview` |
| `preview` | `START_WORK` | `work` |
| `work` | `START_REST` | `rest` |
| `work` | `COMPLETE` | `complete` |
| `rest` | `COMPLETE` | `complete` |
| `activity` | `COMPLETE` | `complete` |

Invalid transitions must throw an error. This is intentional: UI bugs should fail loudly during tests and development.

## Persistence

Persist only stable state:

- plan ID
- week ID
- day ID
- activity ID
- exercise ID
- current phase
- remaining seconds
- round
- completion records

Do not persist volatile timer IDs, intervals, browser notification handles, or React component state.

## Testing Requirements

Tests must cover:

- Initial state for empty and non-empty exercise arrays.
- Preview to work transition.
- Work to rest transition.
- Rest to next exercise transition.
- Round progression.
- Completion phase.
- Invalid training navigation transitions.
- Reset behavior.

## Future Extensions

- Pause and resume.
- Manual time adjustment.
- Skip rest.
- Undo completion.
- Activity-level pause after each exercise.
- Persist and restore in-progress session from IndexedDB.
