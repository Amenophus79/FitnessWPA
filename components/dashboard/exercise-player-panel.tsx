"use client";

/* eslint-disable @next/next/no-img-element */

import { Check, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  createInitialPlayerState,
  transitionPlayerState
} from "@/features/exercise-player/player-state-machine";
import type { Exercise } from "@/types/domain";

export function ExercisePlayerPanel({
  exercises,
  activityId,
  onCompleteExercise
}: {
  exercises: Exercise[];
  activityId?: string;
  onCompleteExercise?: (exerciseId: string, activityId?: string) => void;
}) {
  const [state, setState] = useState(() => createInitialPlayerState(exercises));
  const exercise = exercises[state.exerciseIndex];
  const isExerciseCompleted = Boolean(exercise?.completedAt || (exercise && state.completedExerciseIds.includes(exercise.id)));
  const phaseDuration = useMemo(() => {
    if (!exercise) {
      return 1;
    }

    if (state.phase === "preview") {
      return exercise.previewDurationSeconds;
    }
    if (state.phase === "work") {
      return exercise.defaultDurationSeconds;
    }
    if (state.phase === "rest") {
      return exercise.restDurationSeconds;
    }
    return 1;
  }, [exercise, state.phase]);

  useEffect(() => {
    if (state.phase === "complete") {
      return;
    }

    const timer = window.setInterval(() => {
      setState((current) => transitionPlayerState(current, { type: "TICK" }, exercises));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [exercises, state.phase]);

  const progress = state.phase === "complete" ? 100 : ((phaseDuration - state.remainingSeconds) / phaseDuration) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercise Player</CardTitle>
        <CardDescription>{state.phase === "complete" ? "Session complete" : `${state.phase} phase`}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {exercise ? (
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <img
              src={exercise.media.imageUrl}
              alt={exercise.name}
              className="h-36 w-full rounded-md object-cover md:h-full"
            />
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold">{exercise.name}</p>
                <p className="text-sm text-muted-foreground">{exercise.description}</p>
                {exercise.muscles.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {exercise.muscles.map((muscle) => (
                      <Badge key={muscle}>{formatMuscleName(muscle)}</Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold tabular-nums">{state.remainingSeconds}</span>
                <span className="pb-2 text-sm uppercase text-muted-foreground">seconds</span>
              </div>
              <Progress value={progress} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setState((current) => transitionPlayerState(current, { type: "SKIP" }, exercises))}
                >
                  <SkipForward className="h-4 w-4" aria-hidden />
                  Next
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!exercise || isExerciseCompleted}
                  onClick={() =>
                    setState((current) => {
                      onCompleteExercise?.(exercise.id, activityId);
                      return transitionPlayerState(current, { type: "MARK_COMPLETED", exerciseId: exercise.id }, exercises);
                    })
                  }
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {isExerciseCompleted ? "Completed" : "Complete"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setState((current) => transitionPlayerState(current, { type: "RESET" }, exercises))}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Reset
                </Button>
                {exercise.media.videoUrl ? (
                  <Button asChild type="button" size="sm" variant="secondary">
                    <a href={exercise.media.videoUrl} target="_blank" rel="noreferrer">
                      Video
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-muted p-6 text-sm text-muted-foreground">No exercises loaded.</div>
        )}
      </CardContent>
    </Card>
  );
}

function formatMuscleName(value: string) {
  return value.replaceAll("_", " ");
}
