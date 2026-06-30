# JSON Schema

The import parser lives in:

```text
features/import/training-plan-schema.ts
```

The OpenAI structured output schema lives in:

```text
openai/training-plan-json-schema.ts
```

## Required Root Fields

```json
{
  "version": "1.0",
  "title": "Marathon 2026-09-12",
  "startDate": "2026-08-03",
  "endDate": "2026-09-12",
  "weeks": []
}
```

Use either:

```json
{ "startDate": "2026-08-03", "endDate": "2026-09-12" }
```

or:

```json
{ "startDate": "2026-08-03", "durationDays": 41 }
```

Do not provide both `endDate` and `durationDays`.

Exercise definitions are optional at plan level when all `exerciseId` values resolve through the built-in catalog, the local IndexedDB catalog, or a root `exerciseCatalog` array.

## Sports

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

## Multiple Activities Per Day

```json
{
  "weekday": "friday",
  "activities": [
    {
      "name": "Progressive long run",
      "sport": "running",
      "plannedDurationMinutes": 105,
      "plannedDistanceKm": 19,
      "exercises": [{ "exerciseId": "long_run" }]
    },
    {
      "name": "Short Tabata finisher",
      "sport": "tabata",
      "plannedDurationMinutes": 8,
      "exercises": [{ "exerciseId": "mountain_climber", "rounds": 4 }]
    }
  ]
}
```

See `public/examples/marathon-2026-09-12.json` for a full plan with exercises, media, notifications, and weekly measurements.

## Compact Marathon + Tabata Plans

The parser also accepts the compact marathon/Tabata planning shape used by `marathon-2026-tabata` and normalizes it before validation. This does not change the schema; it expands:

- `planName` to `title`
- `goal` and body-tracking settings to `description`
- `activities` and calendar dates to concrete `weeks[].days[]`
- `templates` to alternating Tabata exercise sequences
- `periodization` to phase-specific block counts
- `tabataProtocol` to work/rest/preview timings
- relative Tabata delay after running to a fixed browser notification time

The normalized result is then validated by `features/import/training-plan-schema.ts` like every other import.
