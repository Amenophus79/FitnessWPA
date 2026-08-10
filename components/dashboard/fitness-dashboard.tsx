"use client";

import {
  ActivityIcon,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Flame,
  Gauge,
  LineChart,
  ListChecks,
  PlayCircle,
  RefreshCw,
  Route,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { markActivityCompletedInPlans, markExerciseCompletedInPlans } from "@/features/training/completion";
import {
  createLocalFileStoreSnapshot,
  hasLocalFileStoreData,
  loadLocalFileStoreSnapshot,
  mergeLocalFileStoreSnapshots,
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
  listCompletedExercises,
  listDeletedPlanIds,
  replaceBodyMeasurements,
  replaceCompletedExercises,
  replaceDeletedPlanIds,
  replaceExerciseCatalogItems,
  replacePlans,
  saveBodyMeasurement,
  saveCompletedExercise,
  saveExerciseCatalogItems,
  savePlan
} from "@/storage/offline-store";
import type { Activity, BodyMeasurement, CompletedExercise, Exercise, ExerciseSegment, Plan } from "@/types/domain";

export function FitnessDashboard() {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [allMeasurements, setAllMeasurements] = useState<BodyMeasurement[]>(demoMeasurements);
  const [allCompletedExercises, setAllCompletedExercises] = useState<CompletedExercise[]>([]);
  const [deletedPlanIds, setDeletedPlanIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>(exerciseCatalog);
  const [activeLocalProfile, setActiveLocalProfile] = useState("");
  const [localUserIdInput, setLocalUserIdInput] = useState("");
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [selectedPlanDate, setSelectedPlanDate] = useState<string>();
  const [selectedActivityId, setSelectedActivityId] = useState<string>();
  const [detailSource, setDetailSource] = useState<"today" | "schedule">();
  const [activeTab, setActiveTab] = useState("plan");
  const [isSyncingLocalStore, setIsSyncingLocalStore] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState("");
  const dayScrollerRef = useRef<HTMLDivElement>(null);
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
  const selectedActivity = selectedDayActivities.find((activity) => activity.id === selectedActivityId) ?? selectedDayActivities[0];
  const playerActivity =
    (selectedActivity?.exercises.length ? selectedActivity : undefined) ??
    selectedDayActivities.find((activity) => activity.exercises.length > 0) ??
    todayActivities.find((activity) => activity.exercises.length > 0) ??
    activities.find((activity) => activity.exercises.length > 0);
  const sports = [...new Set(activities.map((activity) => activity.sport))];
  const syncLocalStoreWithServer = useCallback(async () => {
    if (!isStorageReady) {
      return;
    }

    setIsSyncingLocalStore(true);
    try {
      const localSnapshot = createLocalFileStoreSnapshot({
        plans: allPlans,
        bodyMeasurements: allMeasurements,
        exerciseCatalog: catalog,
        completedExercises: allCompletedExercises,
        deletedPlanIds
      });
      const fileSnapshot = await loadLocalFileStoreSnapshot().catch(() => undefined);
      const mergedSnapshot = mergeLocalFileStoreSnapshots(localSnapshot, fileSnapshot);

      setAllPlans(mergedSnapshot.plans);
      setAllMeasurements(mergedSnapshot.bodyMeasurements);
      setAllCompletedExercises(mergedSnapshot.completedExercises);
      setDeletedPlanIds(mergedSnapshot.deletedPlanIds ?? []);
      setCatalog(mergedSnapshot.exerciseCatalog);
      await Promise.all([
        replacePlans(mergedSnapshot.plans),
        replaceBodyMeasurements(mergedSnapshot.bodyMeasurements),
        replaceCompletedExercises(mergedSnapshot.completedExercises),
        replaceDeletedPlanIds(mergedSnapshot.deletedPlanIds ?? []),
        replaceExerciseCatalogItems(mergedSnapshot.exerciseCatalog)
      ]);

      await saveLocalFileStoreSnapshot(mergedSnapshot);
      setSyncStatusMessage("Synced local changes to the deployment machine.");
    } catch {
      setSyncStatusMessage("Offline: changes are saved on this device and will sync when reachable.");
    } finally {
      setIsSyncingLocalStore(false);
    }
  }, [allCompletedExercises, allMeasurements, allPlans, catalog, deletedPlanIds, isStorageReady]);
  const persistLocalFileStore = useCallback(
    async (
      nextPlans: Plan[],
      nextMeasurements: BodyMeasurement[],
      nextCatalog: ExerciseCatalogItem[],
      nextCompletedExercises: CompletedExercise[],
      nextDeletedPlanIds = deletedPlanIds
    ) => {
      await saveLocalFileStoreSnapshot(
        createLocalFileStoreSnapshot({
          plans: nextPlans,
          bodyMeasurements: nextMeasurements,
          exerciseCatalog: nextCatalog,
          completedExercises: nextCompletedExercises,
          deletedPlanIds: nextDeletedPlanIds
        })
      ).catch(() => undefined);
    },
    [deletedPlanIds]
  );

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

        const hasServerSnapshot = Boolean(fileSnapshot && hasLocalFileStoreData(fileSnapshot));
        const seededCatalog = seeded.exerciseCatalog.length > 0 ? seeded.exerciseCatalog : exerciseCatalog;
        const useSeededLocalRecords = seeded.seedAlreadyInstalled || !hasServerSnapshot;
        const localCompletedExercises = useSeededLocalRecords ? await listCompletedExercises().catch(() => []) : [];
        const localDeletedPlanIds = useSeededLocalRecords ? await listDeletedPlanIds().catch(() => []) : [];
        if (cancelled) {
          return;
        }

        const localSnapshot = createLocalFileStoreSnapshot({
          plans: useSeededLocalRecords ? seeded.plans : [],
          bodyMeasurements: useSeededLocalRecords ? seeded.bodyMeasurements : [],
          exerciseCatalog: seededCatalog,
          completedExercises: localCompletedExercises,
          deletedPlanIds: localDeletedPlanIds
        });
        const mergedSnapshot = mergeLocalFileStoreSnapshots(localSnapshot, fileSnapshot);

        setAllPlans(mergedSnapshot.plans);
        setAllMeasurements(mergedSnapshot.bodyMeasurements);
        setAllCompletedExercises(mergedSnapshot.completedExercises);
        setDeletedPlanIds(mergedSnapshot.deletedPlanIds ?? []);
        setCatalog(mergedSnapshot.exerciseCatalog);
        await Promise.all([
          replacePlans(mergedSnapshot.plans),
          replaceBodyMeasurements(mergedSnapshot.bodyMeasurements),
          replaceCompletedExercises(mergedSnapshot.completedExercises),
          replaceDeletedPlanIds(mergedSnapshot.deletedPlanIds ?? []),
          replaceExerciseCatalogItems(mergedSnapshot.exerciseCatalog)
        ]);
        await saveLocalFileStoreSnapshot(mergedSnapshot).catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) {
          const localContext = { plans: [demoPlan], measurements: demoMeasurements };
          setAllPlans(localContext.plans);
          setAllMeasurements(localContext.measurements);
          setAllCompletedExercises([]);
          setDeletedPlanIds([]);
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
    if (!isStorageReady) {
      return;
    }

    const handleOnline = () => {
      void syncLocalStoreWithServer();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [isStorageReady, syncLocalStoreWithServer]);

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
    if (!selectedDayEntry) {
      if (selectedActivityId) {
        setSelectedActivityId(undefined);
      }
      return;
    }

    if (selectedActivityId && selectedDayEntry.day.activities.some((activity) => activity.id === selectedActivityId)) {
      return;
    }

    setSelectedActivityId(selectedDayEntry.day.activities[0]?.id);
  }, [selectedActivityId, selectedDayEntry]);

  useLayoutEffect(() => {
    const selectedDate = selectedDayEntry?.day.date;
    if (activeTab !== "plan" || !selectedDate) {
      return;
    }

    const scroller = dayScrollerRef.current;
    const selectedButton = scroller?.querySelector<HTMLButtonElement>(`[data-plan-date="${selectedDate}"]`);

    if (!scroller || !selectedButton) {
      return;
    }

    const firstButton = scroller.querySelector<HTMLButtonElement>("[data-plan-date]");
    const firstOffset = firstButton?.offsetLeft ?? 0;

    scroller.scrollTo({
      left: selectedButton.offsetLeft - firstOffset,
      behavior: "auto"
    });
  }, [activeTab, selectedDayEntry, planDayEntries]);

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
  }, [activeLocalUserId, allCompletedExercises, allMeasurements, allPlans, catalog, isStorageReady, persistLocalFileStore]);

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

  function openActivity(
    activityId: string,
    date: string,
    tab: "plan" | "player" = "plan",
    source: "today" | "schedule" = "schedule"
  ) {
    setSelectedPlanDate(date);
    setSelectedActivityId(activityId);
    setDetailSource(source);
    setActiveTab(tab);
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
    const nextDeletedPlanIds = [...new Set([...deletedPlanIds, activePlan.id])];
    setAllPlans(nextPlans);
    setAllCompletedExercises(nextCompletedExercises);
    setDeletedPlanIds(nextDeletedPlanIds);
    await deletePlan(activePlan.id);
    await persistLocalFileStore(nextPlans, allMeasurements, catalog, nextCompletedExercises, nextDeletedPlanIds);
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

  async function completeActivity(activityId: string) {
    if (!activePlan) {
      return;
    }

    const completedAt = new Date().toISOString();
    const completion = markActivityCompletedInPlans(allPlans, {
      planId: activePlan.id,
      activityId,
      completedAt
    });
    const planChanged = completion.plans.some((plan, index) => plan !== allPlans[index]);

    if (!planChanged) {
      return;
    }

    const completedExerciseIds = new Set(completion.completedExercises.map((exercise) => exercise.exerciseId));
    const nextCompletedExercises = [
      ...allCompletedExercises.filter((exercise) => !completedExerciseIds.has(exercise.exerciseId)),
      ...completion.completedExercises
    ];

    setAllPlans(completion.plans);
    setAllCompletedExercises(nextCompletedExercises);
    await Promise.all(completion.completedExercises.map((completedExercise) => saveCompletedExercise(completedExercise)));
    const updatedPlan = completion.plans.find((plan) => plan.id === activePlan.id);
    if (updatedPlan) {
      await savePlan(updatedPlan);
    }
    await persistLocalFileStore(completion.plans, allMeasurements, catalog, nextCompletedExercises);
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
              <Button type="button" disabled={!isStorageReady || isSyncingLocalStore} onClick={() => void syncLocalStoreWithServer()}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                {isSyncingLocalStore ? "Syncing" : "Sync"}
              </Button>
              {syncStatusMessage ? <p className="basis-full text-xs text-muted-foreground">{syncStatusMessage}</p> : null}
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
                todayActivities.map((activity) => {
                  const isCompleted = isActivityComplete(activity);

                  return (
                    <div key={activity.id} className="rounded-md border p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{activity.name}</p>
                            <Badge>{activity.sport}</Badge>
                            {activity.intensity ? <Badge>{activity.intensity}</Badge> : null}
                            {isCompleted ? <Badge className="bg-primary/10 text-primary">completed</Badge> : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{formatActivitySummary(activity)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => openActivity(activity.id, today, "plan", "today")}>
                            <ListChecks className="h-4 w-4" aria-hidden />
                            Details
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isCompleted}
                            onClick={() => void completeActivity(activity.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                            {isCompleted ? "Done" : "Mark Done"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No planned activities for the active profile today.</p>
              )}
            </CardContent>
          </Card>
          {detailSource === "today" && selectedDayEntry?.day.date === today && selectedActivity ? (
            <ActivityDetailsCard
              activity={selectedActivity}
              date={today}
              onOpenPlayer={(activityId) => openActivity(activityId, today, "player", "today")}
              onClose={() => setDetailSource(undefined)}
              onCompleteActivity={(activityId) => void completeActivity(activityId)}
              onCompleteExercise={(exerciseId, activityId) => void completeExercise(exerciseId, activityId)}
            />
          ) : null}
        </div>
      </section>

      <section className="container py-6">
        <Tabs defaultValue="plan" value={activeTab} onValueChange={setActiveTab}>
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
                <div className="space-y-4">
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
                      <div ref={dayScrollerRef} className="flex w-full max-w-[37rem] snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
                      {planDayEntries.map(({ weekNumber, day }) => {
                        const isSelected = day.date === selectedDayEntry?.day.date;
                        const isToday = day.date === today;

                        return (
                          <button
                            key={day.id}
                            type="button"
                            data-plan-date={day.date}
                              className={`h-24 w-28 flex-none snap-start rounded-md border px-3 py-2 text-left text-sm ${
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
                          {selectedDayEntry.day.activities.map((activity) => {
                            const isSelected = detailSource === "schedule" && activity.id === selectedActivity?.id;
                            const isCompleted = isActivityComplete(activity);

                            return (
                              <div
                                key={activity.id}
                                className={`rounded-md border p-3 ${
                                  isSelected ? "border-primary bg-primary/10" : "border-transparent bg-muted"
                                }`}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium">{activity.name}</p>
                                      <Badge>{activity.sport}</Badge>
                                      {activity.intensity ? <Badge>{activity.intensity}</Badge> : null}
                                      {isCompleted ? <Badge className="bg-primary/10 text-primary">completed</Badge> : null}
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">{formatActivitySummary(activity)}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={isSelected ? "secondary" : "outline"}
                                      onClick={() => openActivity(activity.id, selectedDayEntry.day.date, "plan", "schedule")}
                                    >
                                      <ListChecks className="h-4 w-4" aria-hidden />
                                      Details
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isCompleted}
                                      onClick={() => void completeActivity(activity.id)}
                                    >
                                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                                      {isCompleted ? "Done" : "Mark Done"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md bg-muted p-6 text-sm text-muted-foreground">No selectable plan day.</div>
                    )}
                  </CardContent>
                </Card>
                  {detailSource === "schedule" ? (
                    <ActivityDetailsCard
                      activity={selectedActivity}
                      date={selectedDayEntry?.day.date}
                      onOpenPlayer={(activityId) => openActivity(activityId, selectedDayEntry?.day.date ?? today, "player", "schedule")}
                      onClose={() => setDetailSource(undefined)}
                      onCompleteActivity={(activityId) => void completeActivity(activityId)}
                      onCompleteExercise={(exerciseId, activityId) => void completeExercise(exerciseId, activityId)}
                    />
                  ) : null}
                </div>
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
        <p>Sync queue: local-file merge on Sync and reconnect</p>
        <p>Plan loading: JSON import available</p>
        <p>Plan generation: requires optional OpenAI server key</p>
      </CardContent>
    </Card>
  );
}

function ActivityDetailsCard({
  activity,
  date,
  onOpenPlayer,
  onClose,
  onCompleteActivity,
  onCompleteExercise
}: {
  activity?: Activity;
  date?: string;
  onOpenPlayer: (activityId: string) => void;
  onClose: () => void;
  onCompleteActivity: (activityId: string) => void;
  onCompleteExercise: (exerciseId: string, activityId: string) => void;
}) {
  if (!activity) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Training Details</CardTitle>
              <CardDescription>No activity selected</CardDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close training details" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Select a scheduled activity to inspect its details.</CardContent>
      </Card>
    );
  }

  const isCompleted = isActivityComplete(activity);
  const completedExerciseCount = activity.exercises.filter(isExerciseComplete).length;
  const expectedPace = formatExpectedPace(activity);
  const expectedSpeed = formatExpectedSpeed(activity);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{activity.name}</CardTitle>
            <CardDescription>{date ? `${date} · ${activity.sport}` : activity.sport}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted ? <Badge className="bg-primary/10 text-primary">completed</Badge> : null}
            <Button type="button" variant="ghost" size="icon" aria-label="Close training details" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{activity.sport}</Badge>
          {activity.intensity ? <Badge>{activity.intensity}</Badge> : null}
          <Badge className="border bg-background text-foreground">{formatActivitySummary(activity)}</Badge>
          {activity.exercises.length > 0 ? (
            <Badge className="border bg-background text-foreground">
              {completedExerciseCount}/{activity.exercises.length} exercises
            </Badge>
          ) : null}
        </div>

        {expectedPace || expectedSpeed ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {expectedPace ? (
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground">Expected pace</p>
                <p className="text-lg font-semibold">{expectedPace}</p>
              </div>
            ) : null}
            {expectedSpeed ? (
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground">Expected speed</p>
                <p className="text-lg font-semibold">{expectedSpeed}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {activity.notes ? <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{activity.notes}</div> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isCompleted} onClick={() => onCompleteActivity(activity.id)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {isCompleted ? "Done" : "Mark Done"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={activity.exercises.length === 0}
            onClick={() => onOpenPlayer(activity.id)}
          >
            <PlayCircle className="h-4 w-4" aria-hidden />
            Player
          </Button>
        </div>

        {activity.exercises.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Exercises</p>
            {activity.exercises.map((exercise) => {
              const exerciseCompleted = isExerciseComplete(exercise);
              const segments = getExerciseSegments(activity, exercise);

              return (
                <div key={exercise.id} className="rounded-md border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{exercise.name}</p>
                        {exerciseCompleted ? <Badge className="bg-primary/10 text-primary">completed</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{exercise.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {exercise.muscles.map((muscle) => (
                          <Badge key={muscle} className="border bg-background text-foreground">
                            {formatMuscleName(muscle)}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {exercise.rounds} rounds · {formatSeconds(exercise.defaultDurationSeconds)} work
                        {exercise.restDurationSeconds ? ` · ${formatSeconds(exercise.restDurationSeconds)} rest` : ""}
                      </p>
                      {segments.length > 0 ? <ExerciseSegmentsList segments={segments} /> : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {exercise.media.videoUrl ? (
                        <Button asChild type="button" size="sm" variant="outline">
                          <a href={exercise.media.videoUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" aria-hidden />
                            Instructions
                          </a>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        disabled={exerciseCompleted}
                        onClick={() => onCompleteExercise(exercise.id, activity.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        {exerciseCompleted ? "Done" : "Mark"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">No individual exercises attached.</div>
        )}
      </CardContent>
    </Card>
  );
}

function ExerciseSegmentsList({ segments, depth = 0 }: { segments: ExerciseSegment[]; depth?: number }) {
  return (
    <div className={depth === 0 ? "space-y-2 pt-1" : "mt-2 space-y-2 border-l pl-3"}>
      {segments.map((segment) => (
        <div key={segment.id} className="rounded-md bg-muted/70 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{segment.name}</p>
            {segment.kind ? <Badge className="border bg-background text-foreground">{segment.kind}</Badge> : null}
            {segment.repeat ? <Badge className="bg-primary/10 text-primary">{segment.repeat}x</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatSegmentSummary(segment)}</p>
          {segment.notes ? <p className="mt-1 text-xs text-muted-foreground">{segment.notes}</p> : null}
          {segment.segments?.length ? <ExerciseSegmentsList segments={segment.segments} depth={depth + 1} /> : null}
        </div>
      ))}
    </div>
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

function isActivityComplete(activity: Activity) {
  return Boolean(activity.completedAt || (activity.exercises.length > 0 && activity.exercises.every(isExerciseComplete)));
}

function isExerciseComplete(exercise: Exercise) {
  return Boolean(exercise.completedAt);
}

function getExerciseSegments(activity: Activity, exercise: Exercise) {
  if (exercise.segments?.length) {
    return exercise.segments;
  }

  if (exercise.sport !== "running") {
    return [];
  }

  return inferRunningExerciseSegments(activity, exercise);
}

function inferRunningExerciseSegments(activity: Activity, exercise: Exercise): ExerciseSegment[] {
  const totalMinutes = activity.plannedDurationMinutes ?? Math.max(1, Math.round(exercise.defaultDurationSeconds / 60));
  const totalDistanceKm = activity.plannedDistanceKm;
  const exerciseKey = `${exercise.catalogId ?? ""} ${exercise.name}`.toLowerCase();

  if (exerciseKey.includes("interval") || exerciseKey.includes("sprint")) {
    return inferredIntervalSegments(exercise.id, totalMinutes);
  }

  if (exerciseKey.includes("progressive") || exerciseKey.includes("long run")) {
    return inferredProgressiveSegments(exercise.id, totalMinutes, totalDistanceKm);
  }

  if (exerciseKey.includes("marathon race")) {
    return inferredRaceSegments(exercise.id);
  }

  return inferredEasyRunSegments(exercise.id, totalMinutes, totalDistanceKm);
}

function inferredIntervalSegments(exerciseId: string, totalMinutes: number): ExerciseSegment[] {
  const repeat = totalMinutes >= 53 ? 7 : totalMinutes >= 47 ? 6 : totalMinutes >= 40 ? 5 : 3;
  const warmupSeconds = 10 * 60;
  const workSeconds = 3 * 60;
  const recoverySeconds = 2 * 60;
  const cooldownSeconds = Math.max(5 * 60, totalMinutes * 60 - warmupSeconds - repeat * (workSeconds + recoverySeconds));

  return [
    {
      id: `${exerciseId}-warmup`,
      name: "Warmup jog",
      kind: "warmup",
      durationSeconds: warmupSeconds,
      distanceKm: 1.5,
      intensity: "easy"
    },
    {
      id: `${exerciseId}-main-set`,
      name: "Main interval set",
      kind: "work",
      repeat,
      segments: [
        {
          id: `${exerciseId}-fast-interval`,
          name: "Fast interval",
          kind: "work",
          durationSeconds: workSeconds,
          distanceKm: 0.8,
          targetPace: "10K effort",
          intensity: "hard"
        },
        {
          id: `${exerciseId}-jog-recovery`,
          name: "Easy jog recovery",
          kind: "recovery",
          durationSeconds: recoverySeconds,
          distanceKm: 0.25,
          targetPace: "easy jog",
          intensity: "recovery"
        }
      ]
    },
    {
      id: `${exerciseId}-cooldown`,
      name: "Cooldown jog",
      kind: "cooldown",
      durationSeconds: cooldownSeconds,
      distanceKm: 1,
      intensity: "easy"
    }
  ];
}

function inferredEasyRunSegments(exerciseId: string, totalMinutes: number, totalDistanceKm?: number): ExerciseSegment[] {
  const warmupMinutes = Math.min(10, Math.max(5, Math.round(totalMinutes * 0.2)));
  const cooldownMinutes = Math.min(5, Math.max(3, Math.round(totalMinutes * 0.1)));
  const steadyMinutes = Math.max(10, totalMinutes - warmupMinutes - cooldownMinutes);
  const distances = splitDistance(totalDistanceKm, [warmupMinutes, steadyMinutes, cooldownMinutes], [0.2, 0.7, 0.1]);

  return [
    {
      id: `${exerciseId}-warmup`,
      name: "Ease into pace",
      kind: "warmup",
      durationSeconds: warmupMinutes * 60,
      distanceKm: distances[0],
      intensity: "easy"
    },
    {
      id: `${exerciseId}-aerobic`,
      name: "Conversational aerobic run",
      kind: "work",
      durationSeconds: steadyMinutes * 60,
      distanceKm: distances[1],
      targetPace: "conversational",
      intensity: "easy"
    },
    {
      id: `${exerciseId}-finish`,
      name: "Relaxed finish",
      kind: "cooldown",
      durationSeconds: cooldownMinutes * 60,
      distanceKm: distances[2],
      intensity: "recovery"
    }
  ];
}

function inferredProgressiveSegments(exerciseId: string, totalMinutes: number, totalDistanceKm?: number): ExerciseSegment[] {
  const easyMinutes = Math.round(totalMinutes * 0.6);
  const steadyMinutes = Math.round(totalMinutes * 0.25);
  const finishMinutes = Math.max(5, totalMinutes - easyMinutes - steadyMinutes);
  const distances = splitDistance(totalDistanceKm, [easyMinutes, steadyMinutes, finishMinutes], [0.58, 0.27, 0.15]);

  return [
    {
      id: `${exerciseId}-easy-opening`,
      name: "Easy aerobic opening",
      kind: "warmup",
      durationSeconds: easyMinutes * 60,
      distanceKm: distances[0],
      targetPace: "easy",
      intensity: "easy"
    },
    {
      id: `${exerciseId}-steady-middle`,
      name: "Steady middle",
      kind: "work",
      durationSeconds: steadyMinutes * 60,
      distanceKm: distances[1],
      targetPace: "steady",
      intensity: "moderate"
    },
    {
      id: `${exerciseId}-controlled-finish`,
      name: "Controlled finish",
      kind: "work",
      durationSeconds: finishMinutes * 60,
      distanceKm: distances[2],
      targetPace: "marathon rhythm",
      intensity: "threshold"
    }
  ];
}

function inferredRaceSegments(exerciseId: string): ExerciseSegment[] {
  return [
    {
      id: `${exerciseId}-opening`,
      name: "Conservative opening",
      kind: "work",
      distanceKm: 10,
      targetPace: "slower than goal pace",
      intensity: "moderate"
    },
    {
      id: `${exerciseId}-middle`,
      name: "Settle and fuel",
      kind: "work",
      distanceKm: 22,
      targetPace: "goal marathon pace",
      intensity: "race",
      notes: "Fuel early and keep effort controlled through 32 km."
    },
    {
      id: `${exerciseId}-final-10k`,
      name: "Final 10 km",
      kind: "work",
      distanceKm: 10.2,
      targetPace: "race by feel",
      intensity: "race"
    }
  ];
}

function splitDistance(totalDistanceKm: number | undefined, durations: number[], fallbackShares: number[]) {
  if (!totalDistanceKm) {
    return durations.map(() => undefined);
  }

  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);

  return durations.map((duration, index) => {
    const share = totalDuration > 0 ? duration / totalDuration : fallbackShares[index] ?? 0;
    return Number((totalDistanceKm * share).toFixed(1));
  });
}

function formatActivitySummary(activity: Activity) {
  const parts = [`${activity.plannedDurationMinutes ?? 0} min`];

  if (activity.plannedDistanceKm) {
    parts.push(`${activity.plannedDistanceKm} km`);
  }

  if (activity.exercises.length > 0) {
    parts.push(`${activity.exercises.length} exercises`);
  }

  return parts.join(" · ");
}

function formatExpectedPace(activity: Activity) {
  if (!activity.plannedDurationMinutes || !activity.plannedDistanceKm) {
    return undefined;
  }

  return formatPace(activity.plannedDurationMinutes * 60, activity.plannedDistanceKm);
}

function formatPace(durationSeconds: number, distanceKm: number) {
  const secondsPerKm = Math.round(durationSeconds / distanceKm);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")} min/km`;
}

function formatExpectedSpeed(activity: Activity) {
  if (!activity.plannedDurationMinutes || !activity.plannedDistanceKm) {
    return undefined;
  }

  return `${((activity.plannedDistanceKm / activity.plannedDurationMinutes) * 60).toFixed(1)} km/h`;
}

function formatSegmentSummary(segment: ExerciseSegment) {
  const parts = [];

  if (segment.durationSeconds) {
    parts.push(formatSeconds(segment.durationSeconds));
  }

  if (segment.distanceKm) {
    parts.push(`${segment.distanceKm} km`);
  }

  if (segment.durationSeconds && segment.distanceKm) {
    parts.push(formatPace(segment.durationSeconds, segment.distanceKm));
    parts.push(`${((segment.distanceKm / segment.durationSeconds) * 3600).toFixed(1)} km/h`);
  }

  if (segment.targetPace) {
    parts.push(segment.targetPace);
  }

  if (segment.targetSpeedKmh) {
    parts.push(`${segment.targetSpeedKmh.toFixed(1)} km/h target`);
  }

  if (segment.intensity) {
    parts.push(segment.intensity);
  }

  return parts.length > 0 ? parts.join(" · ") : "Structured segment";
}

function formatSeconds(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatMuscleName(value: string) {
  return value.replaceAll("_", " ");
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
