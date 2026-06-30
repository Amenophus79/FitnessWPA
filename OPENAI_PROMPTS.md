# OpenAI Prompts

Prompt templates live in:

```text
openai/prompt-templates.ts
```

Templates included:

- Marathon preparation
- Hyrox
- Ultra running
- Strength
- Rowing
- Climbing
- Bouldering
- Multi-sport plans

## Service

`openai/openai-service.ts` calls the OpenAI Responses API and requests a JSON schema response format.

Input:

```ts
natural language prompt
current exercise catalog
```

Output:

```ts
training plan JSON
```

The system instruction requires JSON-only output, and the returned payload is parsed before use. The import layer validates the final JSON with Zod.

## Validation Flow

OpenAI generation is guarded in three steps:

1. The request sends `openai/training-plan-json-schema.ts` as the Responses API JSON schema format.
2. The request includes the current exercise catalog as authoritative JSON so existing IDs can be reused.
3. The `/api/openai` route validates generated JSON with `parseTrainingPlanJson()` before returning it to the frontend.

If generated JSON does not match the app import structure, the route returns:

```json
{
  "code": "OPENAI_INVALID_PLAN"
}
```

The frontend must not import generated plans that fail this server-side validation.

## API Route

```text
app/api/openai/route.ts
```

POST body:

```json
{
  "prompt": "Create a 12 week marathon plan with Tabata on Tuesdays and Sundays",
  "template": "marathon",
  "catalog": [
    {
      "id": "bodyweight_squat",
      "name": "Bodyweight squat",
      "sport": "strength",
      "muscles": ["quads", "glutes"],
      "description": "Controlled squat.",
      "imageUrl": "https://example.com/squat.jpg",
      "videoUrl": "https://example.com/squat.mp4",
      "defaultDurationSeconds": 40,
      "previewDurationSeconds": 10,
      "restDurationSeconds": 20
    }
  ]
}
```

Plan generation rules:

- Existing exercises should be referenced by `exerciseId`.
- Existing catalog items should not be duplicated in root `exercises` or `exerciseCatalog`.
- New exercises must be emitted in root `exerciseCatalog`.
- New exercises must include media URLs, muscles, description, work duration, preview duration, and rest duration.

Set:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
```
