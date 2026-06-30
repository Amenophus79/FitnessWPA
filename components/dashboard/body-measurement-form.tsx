"use client";

import { CircleAlert, CircleCheck, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateBmi, getMeasurementWeekStatus } from "@/features/body/body-measurements";
import { createId } from "@/services/id";
import type { BodyMeasurement } from "@/types/domain";

export function BodyMeasurementForm({
  measurements = [],
  userId,
  onAdd
}: {
  measurements?: BodyMeasurement[];
  userId?: string;
  onAdd: (measurement: BodyMeasurement) => void;
}) {
  const [weightKg, setWeightKg] = useState("77");
  const [heightCm, setHeightCm] = useState("180");
  const [bodyFatPercent, setBodyFatPercent] = useState("16.5");
  const [restingHeartRate, setRestingHeartRate] = useState("48");
  const weeklyStatus = getMeasurementWeekStatus(measurements);
  const isOpen = weeklyStatus.status === "open";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Weekly Measurement</CardTitle>
            <CardDescription>Optional body tracking{userId ? ` for ${userId}` : ""}</CardDescription>
          </div>
          <Badge className={isOpen ? "bg-accent/20 text-foreground" : "bg-primary/10 text-primary"}>
            {isOpen ? "Open this week" : "Done this week"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3 text-sm">
          <div className="mb-1 flex items-center gap-2 font-medium">
            {isOpen ? (
              <CircleAlert className="h-4 w-4 text-accent" aria-hidden />
            ) : (
              <CircleCheck className="h-4 w-4 text-primary" aria-hidden />
            )}
            {isOpen ? "This week's body values are still open" : "This week's body values are recorded"}
          </div>
          <p className="text-muted-foreground">
            Tracking is optional. Week: {weeklyStatus.weekStartsOn} to {weeklyStatus.weekEndsOn}
            {weeklyStatus.measurement ? ` · last entry ${weeklyStatus.measurement.measuredAt}` : ""}
          </p>
        </div>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const weight = Number(weightKg);
            const height = Number(heightCm);
            onAdd({
              id: createId("measurement"),
              measuredAt: new Date().toISOString().slice(0, 10),
              weightKg: weight,
              bmi: calculateBmi(weight, height),
              bodyFatPercent: Number(bodyFatPercent),
              restingHeartRate: Number(restingHeartRate),
              syncStatus: "pending"
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="weightKg">Weight kg</Label>
            <Input id="weightKg" inputMode="decimal" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heightCm">Height cm</Label>
            <Input id="heightCm" inputMode="decimal" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bodyFat">Body fat %</Label>
            <Input id="bodyFat" inputMode="decimal" value={bodyFatPercent} onChange={(event) => setBodyFatPercent(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rhr">Resting heart rate</Label>
            <Input id="rhr" inputMode="numeric" value={restingHeartRate} onChange={(event) => setRestingHeartRate(event.target.value)} />
          </div>
          <Button className="sm:col-span-2" type="submit">
            <Plus className="h-4 w-4" aria-hidden />
            Add measurement
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
