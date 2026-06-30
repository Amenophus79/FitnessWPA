import { addDays, daysBetween, weekdays } from "@/services/date";
import type { ImportedActivity, ImportedActivityExercise, ImportedExerciseDefinition, ImportedWeek, TrainingPlanImport } from "@/types/import";
import type { ActivityIntensity, Sport, Weekday } from "@/types/domain";

interface CompactExerciseReference {
  exerciseId: string;
  videoUrl?: string;
}

interface CompactTemplateBlock {
  name: string;
  exerciseA: CompactExerciseReference;
  exerciseB: CompactExerciseReference;
}

interface CompactTemplate {
  id: string;
  name: string;
  blocks: CompactTemplateBlock[];
}

interface CompactDayActivity {
  sport: Sport;
  trainingType: string;
  templateId?: string;
}

interface CompactActivityDay {
  weekday: string;
  activities: CompactDayActivity[];
}

interface CompactTabataProtocol {
  workSeconds: number;
  restSeconds: number;
  roundsPerBlock: number;
  pauseBetweenBlocksSeconds: number;
  previewSeconds: number;
  estimatedDurationMinutes: number;
}

interface CompactPeriodizationPhase {
  phase: string;
  start: string;
  end: string;
  tabataABlocks?: number;
  tabataBBlocks?: number;
  tabataCBlocks?: number;
  tabataSessionsPerWeek?: number;
  blocksPerSession?: number;
}

interface CompactBodyTracking {
  enabled?: boolean;
  frequency?: string;
  measurements?: string[];
}

interface CompactNotificationRule {
  activity?: Sport;
  time?: string;
  delayAfterRunningHours?: number;
}

interface CompactMarathonTabataPlan {
  planId?: string;
  planName: string;
  goal?: string;
  startDate: string;
  endDate: string;
  bodyTracking?: CompactBodyTracking;
  activities: CompactActivityDay[];
  tabataProtocol: CompactTabataProtocol;
  templates: CompactTemplate[];
  periodization: CompactPeriodizationPhase[];
  priorityExercises?: string[];
  notificationRules?: CompactNotificationRule[];
}

const fallbackImageUrl = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80";

const musclesByExerciseId: Record<string, string[]> = {
  bodyweight_squat: ["quads", "glutes", "hamstrings", "core"],
  glute_bridge: ["glutes", "hamstrings", "core"],
  bulgarian_split_squat_left: ["quads", "glutes", "adductors", "core"],
  bulgarian_split_squat_right: ["quads", "glutes", "adductors", "core"],
  side_plank_left: ["obliques", "core", "glutes", "shoulders"],
  side_plank_right: ["obliques", "core", "glutes", "shoulders"],
  side_plank: ["obliques", "core", "glutes", "shoulders"],
  dead_bug: ["core", "hip_flexors"],
  bird_dog: ["core", "glutes", "back"],
  push_up: ["chest", "triceps", "shoulders", "core"],
  plank: ["core", "shoulders", "glutes"],
  superman: ["back", "glutes", "hamstrings"],
  reverse_snow_angel: ["upper_back", "rear_shoulders", "traps"],
  hollow_hold: ["core", "hip_flexors"],
  calf_raise: ["calves", "feet"],
  tibialis_raise: ["tibialis_anterior", "shins"],
  single_leg_rdl_left: ["hamstrings", "glutes", "calves", "core"],
  single_leg_rdl_right: ["hamstrings", "glutes", "calves", "core"]
};

export function normalizeTrainingPlanInput(input: unknown): unknown {
  if (!isCompactMarathonTabataPlan(input)) {
    return input;
  }

  return compactMarathonTabataToTrainingPlan(input);
}

export function compactMarathonTabataToTrainingPlan(source: CompactMarathonTabataPlan): TrainingPlanImport {
  const templateById = new Map(source.templates.map((template) => [template.id, template]));
  const activityByWeekday = new Map(
    source.activities
      .map((day) => [normalizeWeekday(day.weekday), day.activities] as const)
      .filter((entry): entry is [Weekday, CompactDayActivity[]] => Boolean(entry[0]))
  );
  const weeks = buildWeeks(source, activityByWeekday, templateById);
  const measurementList = source.bodyTracking?.measurements?.join(", ");
  const description = [
    source.goal,
    "Expanded from the compact marathon + Tabata template plan.",
    "Running schedule: Monday interval/sprint, Wednesday easy run, Friday progressive long run.",
    "Tabata protocol: alternating A/B exercises, 20 seconds work, 10 seconds rest, 8 rounds per block.",
    measurementList ? `Optional weekly body tracking fields: ${measurementList}.` : undefined,
    source.priorityExercises?.length ? `Priority exercises: ${source.priorityExercises.join(", ")}.` : undefined
  ]
    .filter(Boolean)
    .join(" ");

  return {
    version: "1.0",
    title: source.planName,
    description,
    startDate: source.startDate,
    endDate: source.endDate,
    timezone: "Europe/Berlin",
    exerciseCatalog: [...runningExerciseDefinitions(), ...deriveTabataDefinitions(source)],
    weeks,
    notificationRules: buildNotificationRules(source),
    bodyMeasurements: buildOpenWeeklyMeasurementSlots(source)
  };
}

function buildWeeks(
  source: CompactMarathonTabataPlan,
  activityByWeekday: Map<Weekday, CompactDayActivity[]>,
  templateById: Map<string, CompactTemplate>
): ImportedWeek[] {
  const weeksByNumber = new Map<number, ImportedWeek>();
  const taperSessionCountByWeek = new Map<number, number>();
  const startWeekdayIndex = weekdayIndex(source.startDate);
  const totalDays = daysBetween(source.startDate, source.endDate);

  for (let offset = 0; offset <= totalDays; offset += 1) {
    const date = addDays(source.startDate, offset);
    const weekday = weekdayFromDate(date);
    const weekNumber = Math.floor((offset + startWeekdayIndex) / 7) + 1;
    const phase = phaseForDate(source.periodization, date);
    const compactActivities = activityByWeekday.get(weekday) ?? [];
    const activities = compactActivities
      .map((activity) => buildActivity(source, activity, templateById, phase, weekNumber, taperSessionCountByWeek))
      .filter((activity): activity is ImportedActivity => Boolean(activity));

    if (date === source.endDate && !activities.some((activity) => activity.name.toLowerCase().includes("marathon"))) {
      activities.push(buildRaceActivity());
    }

    if (activities.length === 0) {
      continue;
    }

    const week = weeksByNumber.get(weekNumber) ?? { weekNumber, days: [] };
    week.days.push({ weekday, date, activities });
    weeksByNumber.set(weekNumber, week);
  }

  return [...weeksByNumber.values()].sort((a, b) => a.weekNumber - b.weekNumber);
}

function buildActivity(
  source: CompactMarathonTabataPlan,
  activity: CompactDayActivity,
  templateById: Map<string, CompactTemplate>,
  phase: CompactPeriodizationPhase | undefined,
  weekNumber: number,
  taperSessionCountByWeek: Map<number, number>
): ImportedActivity | undefined {
  if (activity.sport === "running") {
    return buildRunningActivity(activity.trainingType, phase);
  }

  if (activity.sport !== "tabata" || !activity.templateId) {
    return undefined;
  }

  const template = templateById.get(activity.templateId);
  if (!template) {
    return undefined;
  }

  const blockCount = tabataBlockCount(activity.templateId, phase, template.blocks.length, weekNumber, taperSessionCountByWeek);
  if (blockCount < 1) {
    return undefined;
  }

  return {
    name: `${template.name} (${phase?.phase ?? "standard"})`,
    sport: "tabata",
    intensity: phase?.phase === "taper" ? "easy" : "moderate",
    plannedDurationMinutes: scaledTabataMinutes(source.tabataProtocol, blockCount),
    notes: [
      `Template ${activity.templateId}.`,
      `Periodization phase: ${phase?.phase ?? "standard"}.`,
      `${blockCount} block(s), ${source.tabataProtocol.roundsPerBlock} rounds per block.`,
      `${source.tabataProtocol.workSeconds}s work / ${source.tabataProtocol.restSeconds}s rest.`,
      `${source.tabataProtocol.pauseBetweenBlocksSeconds}s rest is assigned after the last round of each block.`
    ].join(" "),
    exercises: tabataExercises(template, blockCount, source.tabataProtocol)
  };
}

function buildRunningActivity(trainingType: string, phase: CompactPeriodizationPhase | undefined): ImportedActivity {
  const phaseName = phase?.phase ?? "base";
  const details = runningDetails(trainingType, phaseName);

  return {
    name: details.name,
    sport: "running",
    intensity: details.intensity,
    plannedDurationMinutes: details.minutes,
    plannedDistanceKm: details.distanceKm,
    notes: `Running type ${trainingType}; periodization phase ${phaseName}.`,
    exercises: [
      {
        exerciseId: details.exerciseId,
        durationSeconds: details.minutes * 60,
        restSeconds: 0
      }
    ]
  };
}

function buildRaceActivity(): ImportedActivity {
  return {
    name: "Marathon race day",
    sport: "running",
    intensity: "race",
    plannedDurationMinutes: 240,
    plannedDistanceKm: 42.2,
    notes: "Race day represented as the final running activity on the plan end date.",
    exercises: [{ exerciseId: "marathon_race", durationSeconds: 14_400, restSeconds: 0 }]
  };
}

function runningDetails(trainingType: string, phaseName: string) {
  const phaseMultiplier: Record<string, number> = {
    base: 0.9,
    specific: 1,
    peak: 0.85,
    taper: 0.6
  };
  const multiplier = phaseMultiplier[phaseName] ?? 1;

  if (trainingType === "interval_sprint") {
    return {
      exerciseId: "interval_sprint_run",
      name: "Interval / sprint run",
      intensity: "hard" as ActivityIntensity,
      minutes: Math.max(30, Math.round(55 * multiplier)),
      distanceKm: Number((9 * multiplier).toFixed(1))
    };
  }

  if (trainingType === "progressive_long_run") {
    return {
      exerciseId: "progressive_long_run",
      name: "Progressive long run",
      intensity: phaseName === "taper" ? ("easy" as ActivityIntensity) : ("moderate" as ActivityIntensity),
      minutes: Math.max(45, Math.round(120 * multiplier)),
      distanceKm: Number((22 * multiplier).toFixed(1))
    };
  }

  return {
    exerciseId: "easy_run_block",
    name: "Easy run",
    intensity: "easy" as ActivityIntensity,
    minutes: Math.max(30, Math.round(50 * multiplier)),
    distanceKm: Number((8.5 * multiplier).toFixed(1))
  };
}

function tabataExercises(template: CompactTemplate, blockCount: number, protocol: CompactTabataProtocol): ImportedActivityExercise[] {
  return template.blocks.slice(0, blockCount).flatMap((block, blockIndex) => {
    const rounds = Array.from({ length: protocol.roundsPerBlock }, (_, roundIndex) => {
      const exercise = roundIndex % 2 === 0 ? block.exerciseA : block.exerciseB;
      const isLastRoundInBlock = roundIndex === protocol.roundsPerBlock - 1;

      return {
        exerciseId: exercise.exerciseId,
        rounds: 1,
        durationSeconds: protocol.workSeconds,
        restSeconds: isLastRoundInBlock && blockIndex < blockCount - 1 ? protocol.pauseBetweenBlocksSeconds : protocol.restSeconds
      };
    });

    return rounds;
  });
}

function tabataBlockCount(
  templateId: string,
  phase: CompactPeriodizationPhase | undefined,
  fallback: number,
  weekNumber: number,
  taperSessionCountByWeek: Map<number, number>
) {
  if (!phase) {
    return fallback;
  }

  if (phase.tabataSessionsPerWeek && phase.blocksPerSession) {
    const usedSessions = taperSessionCountByWeek.get(weekNumber) ?? 0;
    if (usedSessions >= phase.tabataSessionsPerWeek) {
      return 0;
    }

    taperSessionCountByWeek.set(weekNumber, usedSessions + 1);
    return Math.min(phase.blocksPerSession, fallback);
  }

  const key = templateId === "tabata_a" ? "tabataABlocks" : templateId === "tabata_b" ? "tabataBBlocks" : "tabataCBlocks";
  return Math.min(phase[key] ?? fallback, fallback);
}

function scaledTabataMinutes(protocol: CompactTabataProtocol, blockCount: number) {
  const scale = blockCount / 4;
  return Math.max(5, Math.round(protocol.estimatedDurationMinutes * scale));
}

function phaseForDate(phases: CompactPeriodizationPhase[], date: string) {
  return phases.find((phase) => phase.start <= date && date <= phase.end);
}

function deriveTabataDefinitions(source: CompactMarathonTabataPlan): ImportedExerciseDefinition[] {
  const references = new Map<string, CompactExerciseReference>();

  source.templates.forEach((template) => {
    template.blocks.forEach((block) => {
      references.set(block.exerciseA.exerciseId, block.exerciseA);
      references.set(block.exerciseB.exerciseId, block.exerciseB);
    });
  });

  return [...references.values()].map((reference) => ({
    id: reference.exerciseId,
    name: humanize(reference.exerciseId),
    sport: "tabata",
    muscles: musclesByExerciseId[reference.exerciseId] ?? ["full_body"],
    description: `${humanize(reference.exerciseId)} used in the marathon support Tabata protocol.`,
    imageUrl: fallbackImageUrl,
    videoUrl: reference.videoUrl,
    defaultDurationSeconds: source.tabataProtocol.workSeconds,
    previewDurationSeconds: source.tabataProtocol.previewSeconds,
    restDurationSeconds: source.tabataProtocol.restSeconds
  }));
}

function runningExerciseDefinitions(): ImportedExerciseDefinition[] {
  return [
    {
      id: "interval_sprint_run",
      name: "Interval / sprint run",
      sport: "running",
      muscles: ["calves", "hamstrings", "quads", "glutes", "heart", "lungs"],
      description: "Fast running intervals with controlled recoveries for speed, mechanics, and VO2 stimulus.",
      imageUrl: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80",
      videoUrl: "https://www.youtube.com/results?search_query=running+sprint+interval+workout",
      defaultDurationSeconds: 3300,
      previewDurationSeconds: 60,
      restDurationSeconds: 0
    },
    {
      id: "easy_run_block",
      name: "Easy run",
      sport: "running",
      muscles: ["legs", "heart", "lungs"],
      description: "Conversational aerobic running for recovery, durability, and weekly mileage.",
      imageUrl: "https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=900&q=80",
      videoUrl: "https://www.youtube.com/results?search_query=easy+run+marathon+training",
      defaultDurationSeconds: 3000,
      previewDurationSeconds: 60,
      restDurationSeconds: 0
    },
    {
      id: "progressive_long_run",
      name: "Progressive long run",
      sport: "running",
      muscles: ["legs", "glutes", "heart", "lungs"],
      description: "Long aerobic run that starts easy and finishes steady without crossing race effort.",
      imageUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80",
      videoUrl: "https://www.youtube.com/results?search_query=progressive+long+run+marathon",
      defaultDurationSeconds: 7200,
      previewDurationSeconds: 60,
      restDurationSeconds: 0
    },
    {
      id: "marathon_race",
      name: "Marathon race",
      sport: "running",
      muscles: ["legs", "heart", "lungs", "core"],
      description: "Race-day marathon effort with conservative pacing through the first half.",
      imageUrl: "https://images.unsplash.com/photo-1530143584546-02191bc84eb5?auto=format&fit=crop&w=900&q=80",
      videoUrl: "https://www.youtube.com/results?search_query=marathon+race+pacing",
      defaultDurationSeconds: 14_400,
      previewDurationSeconds: 60,
      restDurationSeconds: 0
    }
  ];
}

function buildNotificationRules(source: CompactMarathonTabataPlan): TrainingPlanImport["notificationRules"] {
  const runningRule = source.notificationRules?.find((rule) => rule.activity === "running");
  const tabataRule = source.notificationRules?.find((rule) => rule.activity === "tabata");
  const tabataDelay = tabataRule?.delayAfterRunningHours ?? 4;

  return [
    {
      id: "running_reminder",
      kind: "sport_specific",
      label: "Running reminder",
      enabled: true,
      time: runningRule?.time ?? "06:30",
      weekdays: ["monday", "wednesday", "friday"],
      sports: ["running"],
      message: "Running session starts soon.",
      leadTimeMinutes: 30
    },
    {
      id: "tabata_after_running",
      kind: "sport_specific",
      label: "Tabata after running",
      enabled: true,
      time: addHoursToTime(runningRule?.time ?? "06:30", tabataDelay),
      weekdays: ["monday", "wednesday", "friday"],
      sports: ["tabata"],
      message: `Tabata support session is scheduled ${tabataDelay} hours after running.`,
      leadTimeMinutes: 15
    },
    {
      id: "weekly_body_tracking",
      kind: "weekday",
      label: "Weekly body tracking",
      enabled: source.bodyTracking?.enabled ?? true,
      time: "18:00",
      weekdays: ["sunday"],
      message: "Optional weekly body values are still open.",
      leadTimeMinutes: 0
    }
  ];
}

function buildOpenWeeklyMeasurementSlots(source: CompactMarathonTabataPlan): TrainingPlanImport["bodyMeasurements"] {
  if (!source.bodyTracking?.enabled || source.bodyTracking.frequency !== "weekly") {
    return undefined;
  }

  const measurements = [];
  for (let offset = 0; offset <= daysBetween(source.startDate, source.endDate); offset += 7) {
    measurements.push({ measuredAt: addDays(source.startDate, offset) });
  }

  return measurements;
}

function isCompactMarathonTabataPlan(input: unknown): input is CompactMarathonTabataPlan {
  if (!isRecord(input)) {
    return false;
  }

  return (
    typeof input.planName === "string" &&
    typeof input.startDate === "string" &&
    typeof input.endDate === "string" &&
    Array.isArray(input.activities) &&
    Array.isArray(input.templates) &&
    Array.isArray(input.periodization) &&
    isRecord(input.tabataProtocol)
  );
}

function weekdayFromDate(date: string): Weekday {
  const jsDay = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return weekdays[(jsDay + 6) % 7];
}

function weekdayIndex(date: string) {
  return weekdays.indexOf(weekdayFromDate(date));
}

function normalizeWeekday(value: string): Weekday | undefined {
  const normalized = value.trim().toLowerCase();
  return weekdays.find((weekday) => weekday === normalized);
}

function humanize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function addHoursToTime(time: string, hours: number) {
  const [hour = "0", minute = "0"] = time.split(":");
  const nextHour = (Number(hour) + hours) % 24;
  return `${String(nextHour).padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
