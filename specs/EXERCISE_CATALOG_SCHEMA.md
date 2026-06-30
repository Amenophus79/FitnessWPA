# Exercise Catalog Schema

The exercise catalog defines reusable exercise metadata for plan imports, OpenAI output, and the exercise player.

Implementation:

```text
exercise-catalog/catalog.ts
types/domain.ts
```

## Exercise Model

```ts
interface ExerciseCatalogItem {
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
```

When a catalog item is inserted into a plan activity, it becomes a domain `Exercise`:

```ts
interface Exercise {
  id: string;
  catalogId?: string;
  name: string;
  sport: Sport;
  muscles: string[];
  description: string;
  media: {
    imageUrl?: string;
    videoUrl?: string;
  };
  defaultDurationSeconds: number;
  previewDurationSeconds: number;
  restDurationSeconds: number;
  rounds: number;
  completedAt?: string;
}
```

## Fields

### `id`

Stable machine-readable identifier.

Examples:

```text
pushup
plank
burpee
mountain_climber
row_interval
```

Use lowercase snake case for new IDs.

### `name`

Human-readable display name.

Examples:

```text
Push-up
Mountain climber
Progressive long run block
```

### `sport`

One supported sport value:

```text
running
tabata
strength
mobility
rowing
cycling
swimming
bouldering
rock_climbing
yoga
walking
hiking
```

### `imageUrl`

Public image URL shown by the exercise player.

Rules:

- Must be HTTPS for production content.
- Should show the actual movement or sport context.
- Should be stable enough for offline caching after first load.
- Avoid purely decorative or unrelated stock imagery.

Example:

```json
"imageUrl": "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80"
```

### `videoUrl`

Public instructional or reference video URL.

Rules:

- Prefer direct instructional links.
- YouTube URLs are supported as external links.
- Keep video optional at runtime but preferred for catalog completeness.

Example:

```json
"videoUrl": "https://www.youtube.com/watch?v=dZgVxmf6jkA"
```

### `previewDurationSeconds`

Countdown shown before work begins.

Typical values:

```text
5-10 seconds for simple bodyweight exercises
10-20 seconds for equipment setup
30-60 seconds for rowing, climbing, or transition-heavy blocks
```

The player state machine starts each exercise with:

```text
Preview -> Work
```

### `defaultDurationSeconds`

Default work duration.

Examples:

```text
20 seconds for Tabata work intervals
45 seconds for planks
120 seconds for rowing intervals
6300 seconds for a long-run block
```

### `restDurationSeconds`

Rest period after work before the next round or exercise.

Examples:

```text
10 seconds for Tabata
20 seconds for strength circuits
60 seconds for rowing or climbing grip work
0 seconds for continuous run blocks
```

### `muscles`

Array of muscle groups or body systems.

Examples:

```json
["chest", "triceps", "shoulders", "core"]
["calves", "hamstrings", "glutes", "hips"]
["heart", "lungs", "legs"]
```

Use broad terms that are useful for filtering and reporting.

## Categories

The catalog should support these practical categories through `sport`, `muscles`, and naming:

- Strength
- Tabata
- Mobility
- Running drills
- Running blocks
- Rowing intervals
- Climbing grip work
- Yoga and recovery
- Endurance cross-training

Future catalog expansion can add a dedicated `category` field if filtering by sport and muscles becomes insufficient.

## Plan References

Training plans should reference reusable catalog entries by `exerciseId`:

```json
{
  "name": "Strength support",
  "sport": "strength",
  "exercises": [
    { "exerciseId": "bodyweight_squat", "rounds": 3 },
    { "exerciseId": "side_plank_left", "durationSeconds": 30 }
  ]
}
```

The import parser resolves IDs in this order:

1. Built-in `exercise-catalog/catalog.ts`
2. User catalog stored in IndexedDB
3. `exerciseCatalog` included in the plan JSON
4. Legacy inline `exercises` included in the plan JSON

This allows compact plan files that do not duplicate exercise metadata. If a plan references an unknown `exerciseId`, import fails with an explicit validation error.

## Import Envelopes

The catalog importer accepts these JSON shapes:

```json
{ "items": [] }
```

```json
{ "exercises": [] }
```

```json
{ "exerciseCatalog": [] }
```

```json
[]
```

`imageUrl`, `videoUrl`, and `restDurationSeconds` are optional on manual import. The parser fills practical defaults for missing media fields so the exercise player still has usable display data.

## UI and OpenAI Extension

The import screen includes an `ExerciseCatalogManager`.

Supported actions:

- Upload or paste catalog JSON.
- Add one exercise manually.
- Persist catalog items locally in IndexedDB.
- Extend the catalog with OpenAI when `OPENAI_API_KEY` is configured.

OpenAI catalog generation uses:

```text
app/api/openai/exercise-catalog/route.ts
openai/exercise-catalog-json-schema.ts
```

Generated items are validated by `parseExerciseCatalogJson()` before they are merged into the local catalog.

## Examples

```json
{
  "id": "burpee",
  "name": "Burpee",
  "sport": "tabata",
  "muscles": ["full_body", "legs", "chest", "core"],
  "description": "Full-body conditioning movement combining squat, plank, and jump.",
  "imageUrl": "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80",
  "videoUrl": "https://www.youtube.com/watch?v=dZgVxmf6jkA",
  "defaultDurationSeconds": 20,
  "previewDurationSeconds": 10,
  "restDurationSeconds": 10
}
```

```json
{
  "id": "dead_hang",
  "name": "Dead hang",
  "sport": "bouldering",
  "muscles": ["forearms", "lats", "shoulders"],
  "description": "A passive bar hang for grip endurance and shoulder control.",
  "imageUrl": "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=80",
  "videoUrl": "https://www.youtube.com/watch?v=sH6a0qYV6ng",
  "defaultDurationSeconds": 30,
  "previewDurationSeconds": 10,
  "restDurationSeconds": 60
}
```
