"use client";

import {
  ActivityIcon,
  CalendarDays,
  Download,
  Flame,
  Gauge,
  LineChart,
  RefreshCw,
  Route,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BodyMeasurementForm } from "@/components/dashboard/body-measurement-form";
import { ExerciseCatalogManager } from "@/components/dashboard/exercise-catalog-manager";
import { ExercisePlayerPanel } from "@/components/dashboard/exercise-player-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { NotificationPanel } from "@/components/dashboard/notification-panel";
import { PlanGenerator } from "@/components/dashboard/plan-generator";
import { PlanImporter } from "@/components/dashboard/plan-importer";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { exerciseCatalog, type ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import { createFitnessExport, stringifyFitnessExport } from "@/features/export/json-export";
import { createTrainingPlanCreationKit, stringifyTrainingPlanCreationKit } from "@/features/export/plan-creation-kit";
import { calculateStatistics } from "@/features/statistics/statistics-service";
import { demoMeasurements, demoPlan } from "@/features/seed/default-plan";
import { markExerciseCompletedInPlans } from "@/features/training/completion";
import {
  createLocalFileStoreSnapshot,
  hasLocalFileStoreData,
  loadLocalFileStoreSnapshot,
  saveLocalFileStoreSnapshot
} from "@/services/local-file-store-client";
import {
  assignMeasurementToLocalUser,
  assignMissingLocalUserContext,
  assignPlanToLocalUser,
  belongsToLocalUser,
  getKnownLocalUserIds,
  normalizeLocalUserId
} from "@/services/local-user-context";
import {
  deletePlan,
  initializeLocalSeed,
  replaceBodyMeasurements,
  replaceExerciseCatalogItems,
  replacePlans,
  saveBodyMeasurement,
  saveCompletedExercise,
  saveExerciseCatalogItems,
  savePlan
} from "@/storage/offline-store";
import type { BodyMeasurement, CompletedExercise, Plan } from "@/types/domain";

export function FitnessDashboard() {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [allMeasurements, setAllMeasurements] = useState<BodyMeasurement[]>(demoMeasurements);
  const [allCompletedExercises, setAllCompletedExercises] = useState<CompletedExercise[]>([]);
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>(exerciseCatalog);
  const [activeLocalProfile, setActiveLocalProfile] = useState("");
  const [localUserIdInput, setLocalUserIdInput] = useState("");
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [selectedPlanDate, setSelectedPlanDate] = useState<string>();
  const [currentDate] = useState(() => new Date());
  const hasActiveLocalProfile = activeLocalProfile.trim().length > 0;
  const activeLocalUserId = hasActiveLocalProfile ? normalizeLocalUserId(activeLocalProfile) : "";
  const plans = useMemo(
    () => allPlans.filter((plan) => belongsToLocalUser(plan.userId, activeLocalUserId)),
    [activeLocalUserId, allPlans]
  );
  const measurements = useMemo(
    () => allMeasurements.filter((measurement) => belongsToLocalUser(measurement.userId, activeLocalUserId)),
    [activeLocalUserId, allMeasurements]
  );
  const knownLocalUserIds = useMemo(() => getKnownLocalUserIds(allPlans, allMeasurements), [allPlans, allMeasurements]);
  const activePlan = plans[0];
  const today = toLocalIsoDate(currentDate);
  const todayLabel = formatCurrentDay(currentDate);
  const statistics = useMemo(() => calculateStatistics(plans, measurements, currentDate), [currentDate, plans, measurements]);
  const currentUserCompletedExercises = useMemo(
    () => allCompletedExercises.filter((exercise) => belongsToLocalUser(exercise.userId, activeLocalUserId)),
    [activeLocalUserId, allCompletedExercises]
  );
  const activities = activePlan?.weeks.flatMap((week) => week.days.flatMap((day) => day.activities)) ?? [];
  const planDayEntries = useMemo(
    () =>
      activePlan?.weeks.flatMap((week) =>
        week.days.map((day) => ({
          weekNumber: week.weekNumber,
          day
        }))
      ) ?? [],
    [activePlan]
  );
  const selectedDayEntry =
    planDayEntries.find((entry) => entry.day.date === selectedPlanDate) ??
    planDayEntries.find((entry) => entry.day.date === today) ??
    planDayEntries[0];
  const todayDays =
    planDayEntries.filter((entry) => entry.day.date === today);
  const todayActivities = todayDays.flatMap(({ day }) => day.activities);
  const selectedDayActivities = selectedDayEntry?.day.activities ?? [];
  const playerActivity =
    selectedDayActivities.find((activity) => activity.exercises.length > 0) ??
    todayActivities.find((activity) => activity.exercises.length > 0) ??
    activities.find((activity) => activity.exercises.length > 0);
  const sports = [...new Set(activities.map((activity) => activity.sport))];

  useEffect(() => {
    let cancelled = false;

    initializeLocalSeed({
      plans: [demoPlan],
      bodyMeasurements: demoMeasurements,
      exerciseCatalog
    })
      .then(async (seeded) => {
        if (cancelled) {
          return;
        }

        const fileSnapshot = await loadLocalFileStoreSnapshot().catch(() => undefined);
        if (cancelled) {
          return;
        }

        if (fileSnapshot && hasLocalFileStoreData(fileSnapshot)) {
          const nextCatalog = fileSnapshot.initialized || fileSnapshot.exerciseCatalog.length > 0 ? fileSnapshot.exerciseCatalog : exerciseCatalog;
          const localContext = { plans: fileSnapshot.plans, measurements: fileSnapshot.bodyMeasurements };
          setAllPlans(localContext.plans);
          setAllMeasurements(localContext.measurements);
          setAllCompletedExercises(fileSnapshot.completedExercises);
          setCatalog(nextCatalog);
          await Promise.all([
            replacePlans(localContext.plans),
            replaceBodyMeasurements(localContext.measurements),
            replaceExerciseCatalogItems(nextCatalog)
          ]);
          if (localContext.plans !== fileSnapshot.plans || localContext.measurements !== fileSnapshot.bodyMeasurements) {
            await saveLocalFileStoreSnapshot(
              createLocalFileStoreSnapshot({
                plans: localContext.plans,
                bodyMeasurements: localContext.measurements,
                exerciseCatalog: nextCatalog,
                completedExercises: fileSnapshot.completedExercises
              })
            ).catch(() => undefined);
          }
          return;
        }

        const seededCatalog = seeded.exerciseCatalog.length > 0 ? seeded.exerciseCatalog : exerciseCatalog;
        const localContext = { plans: seeded.plans, measurements: seeded.bodyMeasurements };
        const seededSnapshot = createLocalFileStoreSnapshot({
          plans: localContext.plans,
          bodyMeasurements: localContext.measurements,
          exerciseCatalog: seededCatalog,
          completedExercises: []
        });
        setAllPlans(seededSnapshot.plans);
        setAllMeasurements(seededSnapshot.bodyMeasurements);
        setCatalog(seededSnapshot.exerciseCatalog);
        await saveLocalFileStoreSnapshot(seededSnapshot).catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) {
          const localContext = { plans: [demoPlan], measurements: demoMeasurements };
          setAllPlans(localContext.plans);
          setAllMeasurements(localContext.measurements);
          setAllCompletedExercises([]);
          setCatalog(exerciseCatalog);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsStorageReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.removeItem("fitness-pwa.local-user-id");
  }, []);

  useEffect(() => {
    if (planDayEntries.length === 0) {
      setSelectedPlanDate(undefined);
      return;
    }

    if (selectedPlanDate && planDayEntries.some((entry) => entry.day.date === selectedPlanDate)) {
      return;
    }

    const defaultEntry =
      planDayEntries.find((entry) => entry.day.date === today) ??
      planDayEntries.find((entry) => entry.day.date > today) ??
      planDayEntries[0];

    setSelectedPlanDate(defaultEntry?.day.date);
  }, [planDayEntries, selectedPlanDate, today]);

  useEffect(() => {
    if (!isStorageReady || !activeLocalUserId) {
      return;
    }

    const hasUnassignedRecords = allPlans.some((plan) => !plan.userId) || allMeasurements.some((measurement) => !measurement.userId);
    if (!hasUnassignedRecords) {
      return;
    }

    const localContext = assignMissingLocalUserContext({
      plans: allPlans,
      measurements: allMeasurements,
      userId: activeLocalUserId
    });
    setAllPlans(localContext.plans);
    setAllMeasurements(localContext.measurements);
    void Promise.all([replacePlans(localContext.plans), replaceBodyMeasurements(localContext.measurements)]);
    void persistLocalFileStore(localContext.plans, localContext.measurements, catalog, allCompletedExercises);
  }, [activeLocalUserId, allCompletedExercises, allMeasurements, allPlans, catalog, isStorageReady]);

  function selectLocalProfile(userId: string) {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return;
    }

    setActiveLocalProfile(normalizedUserId);
    setLocalUserIdInput(normalizedUserId);
  }

  function logoutLocalProfile() {
    setActiveLocalProfile("");
    setLocalUserIdInput("");
  }

  async function updateCatalog(nextCatalog: ExerciseCatalogItem[]) {
    setCatalog(nextCatalog);
    await saveExerciseCatalogItems(nextCatalog);
    await persistLocalFileStore(allPlans, allMeasurements, nextCatalog, allCompletedExercises);
  }

  async function addPlan(plan: Plan) {
    if (!activeLocalUserId) {
      return;
    }

    const userPlan = assignPlanToLocalUser(plan, activeLocalUserId);
    const nextPlans = [userPlan, ...allPlans];
    setAllPlans(nextPlans);
    await savePlan(userPlan);
    await persistLocalFileStore(nextPlans, allMeasurements, catalog, allCompletedExercises);
  }

  async function deleteActivePlan() {
    if (!activePlan) {
      return;
    }

    if (!window.confirm(`Delete "${activePlan.title}" from local storage?`)) {
      return;
    }

    const nextPlans = allPlans.filter((plan) => plan.id !== activePlan.id);
    const nextCompletedExercises = allCompletedExercises.filter((exercise) => exercise.planId !== activePlan.id);
    setAllPlans(nextPlans);
    setAllCompletedExercises(nextCompletedExercises);
    await deletePlan(activePlan.id);
    await persistLocalFileStore(nextPlans, allMeasurements, catalog, nextCompletedExercises);
  }

  async function addMeasurement(measurement: BodyMeasurement) {
    if (!activeLocalUserId) {
      return;
    }

    const userMeasurement = assignMeasurementToLocalUser(measurement, activeLocalUserId);
    const nextMeasurements = [...allMeasurements, userMeasurement];
    setAllMeasurements(nextMeasurements);
    await saveBodyMeasurement(userMeasurement);
    await persistLocalFileStore(allPlans, nextMeasurements, catalog, allCompletedExercises);
  }

  async function completeExercise(exerciseId: string, activityId?: string) {
    if (!activePlan || !activityId) {
      return;
    }

    const completedAt = new Date().toISOString();
    const completion = markExerciseCompletedInPlans(allPlans, {
      planId: activePlan.id,
      activityId,
      exerciseId,
      completedAt
    });

    if (!completion.completedExercise) {
      return;
    }

    const nextCompletedExercises = [
      ...allCompletedExercises.filter((exercise) => exercise.exerciseId !== exerciseId),
      completion.completedExercise
    ];

    setAllPlans(completion.plans);
    setAllCompletedExercises(nextCompletedExercises);
    await saveCompletedExercise(completion.completedExercise);
    const updatedPlan = completion.plans.find((plan) => plan.id === activePlan.id);
    if (updatedPlan) {
      await savePlan(updatedPlan);
    }
    await persistLocalFileStore(completion.plans, allMeasurements, catalog, nextCompletedExercises);
  }

  async function persistLocalFileStore(
    nextPlans: Plan[],
    nextMeasurements: BodyMeasurement[],
    nextCatalog: ExerciseCatalogItem[],
    nextCompletedExercises: CompletedExercise[]
  ) {
    await saveLocalFileStoreSnapshot(
      createLocalFileStoreSnapshot({
        plans: nextPlans,
        bodyMeasurements: nextMeasurements,
        exerciseCatalog: nextCatalog,
        completedExercises: nextCompletedExercises
      })
    ).catch(() => undefined);
  }

  function downloadExport() {
    if (!activeLocalUserId) {
      return;
    }

    const exported = stringifyFitnessExport(
      createFitnessExport({
        plans,
        bodyMeasurements: measurements,
        completedExercises: currentUserCompletedExercises,
        statistics
      })
    );

    downloadJsonFile("fitness-export.json", exported);
  }

  function downloadPlanCreationKit() {
    downloadJsonFile(
      "training-plan-creation-kit.json",
      stringifyTrainingPlanCreationKit(createTrainingPlanCreationKit(catalog))
    );
  }

  function downloadJsonFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!hasActiveLocalProfile) {
    return (
      <LocalProfileGate
        isStorageReady={isStorageReady}
        knownLocalUserIds={knownLocalUserIds}
        localUserIdInput={localUserIdInput}
        onInputChange={setLocalUserIdInput}
        onSelectProfile={selectLocalProfile}
      />
    );
  }

  return (
    <main className="min-h-screen">
      <section className="shell-grid border-b bg-background">
        <div className="container flex flex-col gap-6 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary">Offline first</Badge>
                <Badge className="bg-accent/20 text-foreground">Local profile</Badge>
                <Badge className="bg-secondary text-secondary-foreground">Installable</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-normal md:text-5xl">
                  {activePlan?.title ?? (isStorageReady ? "No active plan" : "Loading training data")}
                </h1>
                <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
                  {activePlan?.description ??
                    (isStorageReady
                      ? "Import a JSON plan or generate one when OpenAI is configured."
                      : "Preparing local offline storage.")}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">Today: {todayLabel}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-56 space-y-2">
                <Label htmlFor="local-user-id" className="text-xs text-muted-foreground">
                  Local profile
                </Label>
                <Input
                  id="local-user-id"
                  placeholder="Type a profile ID"
                  value={localUserIdInput}
                  onChange={(event) => setLocalUserIdInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      selectLocalProfile(localUserIdInput);
                    }
                  }}
                  onBlur={() => setLocalUserIdInput(activeLocalUserId)}
                />
                <div className="flex flex-wrap gap-1">
                  {knownLocalUserIds.map((userId) => (
                    <button
                      key={userId}
                      type="button"
                      className={`rounded-md border px-2 py-1 text-xs ${
                        userId === activeLocalUserId ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground"
                      }`}
                      onClick={() => setLocalUserIdInput(userId)}
                    >
                      {userId}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="button" variant="outline" onClick={logoutLocalProfile}>
                Change Profile
              </Button>
              {activePlan ? (
                <Button type="button" variant="outline" onClick={() => void deleteActivePlan()}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete Plan
                </Button>
              ) : null}
              <Button type="button">
                <RefreshCw className="h-4 w-4" aria-hidden />
                Sync
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard icon={Flame} label="Training streak" value={`${statistics.trainingStreakDays} days`} />
            <MetricCard icon={Gauge} label="Weekly volume" value={`${statistics.weeklyVolumeMinutes} min`} />
            <MetricCard icon={Route} label="Running distance" value={`${statistics.runningDistanceKm} km`} />
            <MetricCard icon={ActivityIcon} label="Completion" value={`${Math.round(statistics.exerciseCompletionRate * 100)}%`} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Today</CardTitle>
              <CardDescription>{todayLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {todayActivities.length > 0 ? (
                todayActivities.map((activity) => (
                  <div key={activity.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{activity.name}</p>
                      <Badge>{activity.sport}</Badge>
                      {activity.completedAt ? <Badge className="bg-primary/10 text-primary">completed</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activity.plannedDurationMinutes ?? 0} min
                      {activity.plannedDistanceKm ? ` · ${activity.plannedDistanceKm} km` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No planned activities for the active profile today.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-6">
        <Tabs defaultValue="plan">
          <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="player">Player</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="import">Import/Export</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="plan">
            {activePlan ? (
              <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>Schedule</CardTitle>
                        <CardDescription>
                          {selectedDayEntry
                            ? `Selected: ${selectedDayEntry.day.weekday}, ${selectedDayEntry.day.date}`
                            : `${sports.length} sports this block`}
                        </CardDescription>
                      </div>
                      {planDayEntries.some((entry) => entry.day.date === today) ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedPlanDate(today)}>
                          Today
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {planDayEntries.map(({ weekNumber, day }) => {
                        const isSelected = day.date === selectedDayEntry?.day.date;
                        const isToday = day.date === today;

                        return (
                          <button
                            key={day.id}
                            type="button"
                            className={`min-w-28 rounded-md border px-3 py-2 text-left text-sm ${
                              isSelected ? "border-primary bg-primary/10 text-primary" : "bg-background text-foreground"
                            } ${isToday && !isSelected ? "border-primary/60" : ""}`}
                            onClick={() => setSelectedPlanDate(day.date)}
                          >
                            <span className="block text-xs text-muted-foreground">W{weekNumber}</span>
                            <span className="block font-medium capitalize">{day.weekday.slice(0, 3)}</span>
                            <span className="block text-xs">{day.date.slice(5)}</span>
                            {isToday ? <span className="mt-1 inline-block text-xs font-medium">today</span> : null}
                          </button>
                        );
                      })}
                    </div>

                    {selectedDayEntry ? (
                      <div
                        className={`rounded-md border p-3 ${
                          selectedDayEntry.day.date === today ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
                            <p className="text-sm font-semibold capitalize">{selectedDayEntry.day.weekday}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge>Week {selectedDayEntry.weekNumber}</Badge>
                            <Badge>{selectedDayEntry.day.date}</Badge>
                            {selectedDayEntry.day.date === today ? <Badge className="bg-primary/10 text-primary">today</Badge> : null}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          {selectedDayEntry.day.activities.map((activity) => (
                            <div key={activity.id} className="rounded-md bg-muted p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{activity.name}</p>
                                <Badge>{activity.sport}</Badge>
                                {activity.intensity ? <Badge>{activity.intensity}</Badge> : null}
                                {activity.completedAt ? <Badge className="bg-primary/10 text-primary">completed</Badge> : null}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {activity.plannedDurationMinutes ?? 0} min
                                {activity.plannedDistanceKm ? ` · ${activity.plannedDistanceKm} km` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md bg-muted p-6 text-sm text-muted-foreground">No selectable plan day.</div>
                    )}
                  </CardContent>
                </Card>
                <SystemStatusCard
                  isStorageReady={isStorageReady}
                  activeLocalUserId={activeLocalUserId}
                  planCount={plans.length}
                  measurementCount={measurements.length}
                  totalUserCount={knownLocalUserIds.length}
                />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>No Plan Loaded</CardTitle>
                    <CardDescription>The installation seed has already run and no local plan is active.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Import a JSON plan or use OpenAI generation when configured. The starter plan will not be restored automatically.
                  </CardContent>
                </Card>
                <SystemStatusCard
                  isStorageReady={isStorageReady}
                  activeLocalUserId={activeLocalUserId}
                  planCount={plans.length}
                  measurementCount={measurements.length}
                  totalUserCount={knownLocalUserIds.length}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="player">
            <ExercisePlayerPanel
              exercises={playerActivity?.exercises ?? []}
              activityId={playerActivity?.id}
              onCompleteExercise={(exerciseId, activityId) => void completeExercise(exerciseId, activityId)}
            />
          </TabsContent>

          <TabsContent value="tracking">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <BodyMeasurementForm
                measurements={measurements}
                userId={activeLocalUserId}
                onAdd={(measurement) => void addMeasurement(measurement)}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Trends</CardTitle>
                  <CardDescription>Weight, BMI, and body-fat trends from weekly measurements.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <LineChart className="h-4 w-4" aria-hidden />
                      Weight
                    </div>
                    <TrendChart points={statistics.weightTrend} label="weight" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">BMI</div>
                    <TrendChart points={statistics.bmiTrend} label="BMI" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">Body fat</div>
                    <TrendChart points={statistics.bodyFatTrend} label="body fat" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <div className="grid gap-4 xl:grid-cols-2">
              <PlanImporter catalog={catalog} onImport={(plan) => void addPlan(plan)} />
              <PlanGenerator catalog={catalog} onImport={(plan) => void addPlan(plan)} />
              <Card>
                <CardHeader>
                  <CardTitle>JSON Export</CardTitle>
                  <CardDescription>Profile backup and external plan creation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border bg-background text-foreground">Plans: {plans.length}</Badge>
                    <Badge className="border bg-background text-foreground">Measurements: {measurements.length}</Badge>
                    <Badge className="border bg-background text-foreground">Completions: {currentUserCompletedExercises.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={downloadExport}>
                      <Download className="h-4 w-4" aria-hidden />
                      Export profile data
                    </Button>
                    <Button type="button" variant="outline" onClick={downloadPlanCreationKit}>
                      <Download className="h-4 w-4" aria-hidden />
                      Download creation kit
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <ExerciseCatalogManager catalog={catalog} onCatalogChange={(nextCatalog) => void updateCatalog(nextCatalog)} />
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            {activePlan ? (
              <NotificationPanel plan={activePlan} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>No active plan</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Import or create a plan to configure plan notifications.</CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

function SystemStatusCard({
  isStorageReady,
  activeLocalUserId,
  planCount,
  measurementCount,
  totalUserCount
}: {
  isStorageReady: boolean;
  activeLocalUserId: string;
  planCount: number;
  measurementCount: number;
  totalUserCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
        <CardDescription>Local session</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
          Local profiles: enabled
        </p>
        <p>IndexedDB cache: {isStorageReady ? "ready" : "loading"}</p>
        <p>Local user context: {activeLocalUserId}</p>
        <p>Known local users: {totalUserCount}</p>
        <p>User plans: {planCount}</p>
        <p>User measurements: {measurementCount}</p>
        <p>Initial seed: installation-time only</p>
        <p>Sync queue: waiting for network events</p>
        <p>Plan loading: JSON import available</p>
        <p>Plan generation: requires optional OpenAI server key</p>
      </CardContent>
    </Card>
  );
}

function LocalProfileGate({
  isStorageReady,
  knownLocalUserIds,
  localUserIdInput,
  onInputChange,
  onSelectProfile
}: {
  isStorageReady: boolean;
  knownLocalUserIds: string[];
  localUserIdInput: string;
  onInputChange: (value: string) => void;
  onSelectProfile: (userId: string) => void;
}) {
  return (
    <main className="min-h-screen bg-background">
      <section className="container flex min-h-screen items-center py-10">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary">Local profiles</Badge>
              <Badge className="bg-secondary text-secondary-foreground">Offline first</Badge>
            </div>
            <CardTitle>Choose Profile</CardTitle>
            <CardDescription>
              Select or create a local profile before personal plans, measurements, and completions are shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-login">Profile ID</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="profile-login"
                  value={localUserIdInput}
                  placeholder="anna, child-1, norman"
                  onChange={(event) => onInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onSelectProfile(localUserIdInput);
                    }
                  }}
                />
                <Button type="button" disabled={!localUserIdInput.trim()} onClick={() => onSelectProfile(localUserIdInput)}>
                  Continue
                </Button>
              </div>
            </div>

            {knownLocalUserIds.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Known profiles</p>
                <div className="flex flex-wrap gap-2">
                  {knownLocalUserIds.map((userId) => (
                    <Button key={userId} type="button" variant="outline" size="sm" onClick={() => onSelectProfile(userId)}>
                      {userId}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Local profiles separate plans, body values, and completed exercises. The exercise catalog and OpenAI integration remain shared.
            </div>
            <p className="text-xs text-muted-foreground">Local storage: {isStorageReady ? "ready" : "loading"}</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function toLocalIsoDate(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatCurrentDay(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}
