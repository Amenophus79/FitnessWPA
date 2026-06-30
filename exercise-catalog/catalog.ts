import type { Exercise, Sport } from "@/types/domain";

export interface ExerciseCatalogItem {
  id: string;
  name: string;
  sport: Sport;
  muscles: string[];
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  defaultDurationSeconds: number;
  previewDurationSeconds: number;
  restDurationSeconds?: number;
}

const baseExerciseCatalog: ExerciseCatalogItem[] = [
  {
    id: "pushup",
    name: "Push-up",
    sport: "strength",
    muscles: ["chest", "triceps", "shoulders", "core"],
    description: "A controlled upper-body press from a plank position.",
    imageUrl: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4",
    defaultDurationSeconds: 40,
    previewDurationSeconds: 10,
    restDurationSeconds: 20
  },
  {
    id: "plank",
    name: "Plank",
    sport: "strength",
    muscles: ["core", "shoulders", "glutes"],
    description: "A static anti-extension core hold with steady breathing.",
    imageUrl: "https://images.unsplash.com/photo-1562771242-a02d9090c90c?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://www.youtube.com/watch?v=pSHjTRCQxIw",
    defaultDurationSeconds: 45,
    previewDurationSeconds: 10,
    restDurationSeconds: 20
  },
  {
    id: "burpee",
    name: "Burpee",
    sport: "tabata",
    muscles: ["full_body", "legs", "chest", "core"],
    description: "A full-body conditioning movement combining squat, plank, and jump.",
    imageUrl: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://www.youtube.com/watch?v=dZgVxmf6jkA",
    defaultDurationSeconds: 20,
    previewDurationSeconds: 10,
    restDurationSeconds: 10
  },
  {
    id: "mountain_climber",
    name: "Mountain climber",
    sport: "tabata",
    muscles: ["core", "hip_flexors", "shoulders"],
    description: "A fast alternating knee drive from a high plank.",
    imageUrl: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://www.youtube.com/watch?v=nmwgirgXLYM",
    defaultDurationSeconds: 20,
    previewDurationSeconds: 10,
    restDurationSeconds: 10
  },
  {
    id: "jump_squat",
    name: "Jump squat",
    sport: "tabata",
    muscles: ["quads", "glutes", "calves"],
    description: "An explosive squat variation for power and conditioning.",
    imageUrl: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://www.youtube.com/watch?v=CVaEhXotL7M",
    defaultDurationSeconds: 20,
    previewDurationSeconds: 10,
    restDurationSeconds: 10
  },
  {
    id: "dead_hang",
    name: "Dead hang",
    sport: "bouldering",
    muscles: ["forearms", "lats", "shoulders"],
    description: "A passive bar hang for grip endurance and shoulder control.",
    imageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://www.youtube.com/watch?v=sH6a0qYV6ng",
    defaultDurationSeconds: 30,
    previewDurationSeconds: 10,
    restDurationSeconds: 60
  },
  {
    id: "pull_up",
    name: "Pull-up",
    sport: "strength",
    muscles: ["lats", "biceps", "upper_back", "core"],
    description: "A vertical pulling movement from a dead hang to chin over bar.",
    imageUrl: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
    defaultDurationSeconds: 40,
    previewDurationSeconds: 10,
    restDurationSeconds: 60
  },
  {
    id: "row_interval",
    name: "Row interval",
    sport: "rowing",
    muscles: ["legs", "back", "core", "arms"],
    description: "A rowing-machine interval focused on smooth drive and recovery.",
    imageUrl: "https://images.unsplash.com/photo-1508215885820-4585e56135c8?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://www.youtube.com/watch?v=ZN0J6qKCIrI",
    defaultDurationSeconds: 120,
    previewDurationSeconds: 10,
    restDurationSeconds: 60
  }
];

const runningExerciseCatalog: ExerciseCatalogItem[] = [
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
    defaultDurationSeconds: 14400,
    previewDurationSeconds: 60,
    restDurationSeconds: 0
  }
];

const marathonTabataExerciseCatalog: ExerciseCatalogItem[] = [
  tabataExercise("bodyweight_squat", "Bodyweight squat", ["quads", "glutes", "hamstrings", "core"], "Controlled squat pattern for running strength, hip control, and lower-body durability.", "https://www.youtube.com/results?search_query=squat+university+bodyweight+squat"),
  tabataExercise("glute_bridge", "Glute bridge", ["glutes", "hamstrings", "core"], "Hip extension drill for posterior-chain activation and pelvis control.", "https://www.youtube.com/results?search_query=e3+rehab+glute+bridge"),
  tabataExercise("bulgarian_split_squat_left", "Bulgarian split squat left", ["quads", "glutes", "adductors", "core"], "Single-leg squat variation emphasizing left-leg strength, balance, and hip stability.", "https://www.youtube.com/results?search_query=squat+university+bulgarian+split+squat"),
  tabataExercise("bulgarian_split_squat_right", "Bulgarian split squat right", ["quads", "glutes", "adductors", "core"], "Single-leg squat variation emphasizing right-leg strength, balance, and hip stability.", "https://www.youtube.com/results?search_query=squat+university+bulgarian+split+squat"),
  tabataExercise("side_plank_left", "Side plank left", ["obliques", "core", "glutes", "shoulders"], "Left-side anti-lateral-flexion hold for trunk stiffness and hip stability.", "https://www.youtube.com/results?search_query=e3+rehab+side+plank"),
  tabataExercise("side_plank_right", "Side plank right", ["obliques", "core", "glutes", "shoulders"], "Right-side anti-lateral-flexion hold for trunk stiffness and hip stability.", "https://www.youtube.com/results?search_query=e3+rehab+side+plank"),
  tabataExercise("side_plank", "Side plank", ["obliques", "core", "glutes", "shoulders"], "Side plank variation for lateral trunk endurance and hip stability.", "https://www.youtube.com/results?search_query=e3+rehab+side+plank"),
  tabataExercise("dead_bug", "Dead bug", ["core", "hip_flexors"], "Supine anti-extension drill for trunk control while moving opposite arm and leg.", "https://www.youtube.com/results?search_query=e3+rehab+dead+bug"),
  tabataExercise("bird_dog", "Bird dog", ["core", "glutes", "back"], "Quadruped stability drill for hip extension, spinal control, and cross-body coordination.", "https://www.youtube.com/results?search_query=e3+rehab+bird+dog"),
  tabataExercise("push_up", "Push-up", ["chest", "triceps", "shoulders", "core"], "Controlled upper-body press from a strong plank position.", "https://www.youtube.com/results?search_query=squat+university+push+up"),
  tabataExercise("plank", "Plank", ["core", "shoulders", "glutes"], "Static anti-extension hold with steady breathing and full-body tension.", "https://www.youtube.com/results?search_query=e3+rehab+plank"),
  tabataExercise("superman", "Superman", ["back", "glutes", "hamstrings"], "Prone posterior-chain hold for back endurance and hip extension awareness.", "https://www.youtube.com/results?search_query=superman+exercise+technique"),
  tabataExercise("reverse_snow_angel", "Reverse snow angel", ["upper_back", "rear_shoulders", "traps"], "Prone shoulder-control movement for upper-back endurance and posture support.", "https://www.youtube.com/results?search_query=reverse+snow+angel+exercise"),
  tabataExercise("hollow_hold", "Hollow hold", ["core", "hip_flexors"], "Static anterior-core hold for anti-extension strength and trunk stiffness.", "https://www.youtube.com/results?search_query=e3+rehab+hollow+hold"),
  tabataExercise("calf_raise", "Calf raise", ["calves", "feet"], "Controlled ankle plantar-flexion work for calf capacity and Achilles resilience.", "https://www.youtube.com/results?search_query=calf+raise+exercise+technique"),
  tabataExercise("tibialis_raise", "Tibialis raise", ["tibialis_anterior", "shins"], "Anterior-shin strengthening drill for lower-leg balance and running durability.", "https://www.youtube.com/results?search_query=knees+over+toes+guy+tibialis+raise"),
  tabataExercise("single_leg_rdl_left", "Single-leg RDL left", ["hamstrings", "glutes", "calves", "core"], "Left-leg hip-hinge pattern for posterior-chain strength, balance, and foot control.", "https://www.youtube.com/results?search_query=squat+university+single+leg+romanian+deadlift"),
  tabataExercise("single_leg_rdl_right", "Single-leg RDL right", ["hamstrings", "glutes", "calves", "core"], "Right-leg hip-hinge pattern for posterior-chain strength, balance, and foot control.", "https://www.youtube.com/results?search_query=squat+university+single+leg+romanian+deadlift")
];

export const exerciseCatalog: ExerciseCatalogItem[] = mergeCatalogs(baseExerciseCatalog, runningExerciseCatalog, marathonTabataExerciseCatalog);

function tabataExercise(id: string, name: string, muscles: string[], description: string, videoUrl: string): ExerciseCatalogItem {
  return {
    id,
    name,
    sport: "tabata",
    muscles,
    description,
    imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    videoUrl,
    defaultDurationSeconds: 20,
    previewDurationSeconds: 60,
    restDurationSeconds: 10
  };
}

function mergeCatalogs(...catalogs: ExerciseCatalogItem[][]) {
  const merged = new Map<string, ExerciseCatalogItem>();
  catalogs.flat().forEach((item) => merged.set(item.id, item));
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getCatalogExercise(id: string) {
  return exerciseCatalog.find((exercise) => exercise.id === id);
}

export function toExercise(item: ExerciseCatalogItem, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: overrides.id ?? item.id,
    catalogId: item.id,
    name: overrides.name ?? item.name,
    sport: overrides.sport ?? item.sport,
    muscles: overrides.muscles ?? item.muscles,
    description: overrides.description ?? item.description,
    media: overrides.media ?? { imageUrl: item.imageUrl, videoUrl: item.videoUrl },
    defaultDurationSeconds: overrides.defaultDurationSeconds ?? item.defaultDurationSeconds,
    previewDurationSeconds: overrides.previewDurationSeconds ?? item.previewDurationSeconds,
    restDurationSeconds: overrides.restDurationSeconds ?? item.restDurationSeconds ?? 0,
    rounds: overrides.rounds ?? 1,
    completedAt: overrides.completedAt
  };
}
