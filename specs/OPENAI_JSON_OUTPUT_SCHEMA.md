# OpenAI JSON Output Schema

OpenAI plan generation must return JSON only. The returned object is expected to match the training plan import contract and is validated before persistence.

Implementation source:

```text
openai/training-plan-json-schema.ts
openai/exercise-catalog-json-schema.ts
features/import/training-plan-schema.ts
openai/openai-service.ts
```

## Validation Flow

OpenAI generation is guarded in three layers:

1. `openai/openai-service.ts` sends the expected JSON schema to the model through the Responses API JSON schema response format.
2. `app/api/openai/route.ts` optionally receives the current frontend exercise catalog.
3. The generated JSON is validated with `parseTrainingPlanJson()` and the supplied catalog before returning it to the frontend.

Invalid generated output must be rejected with:

```json
{
  "code": "OPENAI_INVALID_PLAN"
}
```

The frontend can show this error, but it must not import the invalid plan.

## Root Object

Required fields:

```text
version
title
startDate
weeks
```

Optional fields:

```text
description
endDate
durationDays
timezone
exercises
exerciseCatalog
notificationRules
bodyMeasurements
```

Date rule:

```text
Provide either endDate or durationDays.
Do not provide both.
```

Exercise rule:

```text
Every activity exerciseId must resolve to one of:

- an existing exercise catalog item supplied by the frontend
- an item in the root exerciseCatalog array
- an item in the legacy root exercises array
```

OpenAI should prefer existing catalog IDs. It should add `exerciseCatalog` or `exercises` only when the requested plan needs an exercise that does not already exist in the supplied catalog.

## Existing Exercise Context

Plan generation receives the current exercise catalog from the frontend and the built-in catalog from the server. The model sees it as an authoritative JSON block:

```json
[
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
```

Rules for generated plans:

- Reuse existing `id` values whenever the exercise fits.
- Do not redefine existing catalog items in `exercises` or `exerciseCatalog`.
- Put new movements into root `exerciseCatalog`.
- New exercises must include `id`, `name`, `sport`, `muscles`, `description`, `imageUrl`, `videoUrl`, `defaultDurationSeconds`, `previewDurationSeconds`, and `restDurationSeconds`.
- Every activity `exerciseId` must resolve against the supplied catalog or the generated `exerciseCatalog`.

## Supported Sports

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

## Supported Weekdays

```text
monday
tuesday
wednesday
thursday
friday
saturday
sunday
```

## JSON Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["version", "title", "startDate", "weeks"],
  "properties": {
    "version": {
      "type": "string",
      "enum": ["1.0"]
    },
    "title": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "startDate": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
    },
    "endDate": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
    },
    "durationDays": {
      "type": "integer",
      "minimum": 1
    },
    "timezone": {
      "type": "string"
    },
    "exercises": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "name",
          "sport",
          "muscles",
          "description",
          "defaultDurationSeconds",
          "previewDurationSeconds"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "sport": {
            "type": "string",
            "enum": [
              "running",
              "tabata",
              "strength",
              "mobility",
              "rowing",
              "cycling",
              "swimming",
              "bouldering",
              "rock_climbing",
              "yoga",
              "walking",
              "hiking"
            ]
          },
          "muscles": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "description": {
            "type": "string"
          },
          "imageUrl": {
            "type": "string"
          },
          "videoUrl": {
            "type": "string"
          },
          "defaultDurationSeconds": {
            "type": "integer",
            "minimum": 1
          },
          "previewDurationSeconds": {
            "type": "integer",
            "minimum": 0
          },
          "restDurationSeconds": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "exerciseCatalog": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "name",
          "sport",
          "muscles",
          "description",
          "defaultDurationSeconds",
          "previewDurationSeconds"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "sport": {
            "type": "string"
          },
          "muscles": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "description": {
            "type": "string"
          },
          "imageUrl": {
            "type": "string"
          },
          "videoUrl": {
            "type": "string"
          },
          "defaultDurationSeconds": {
            "type": "integer",
            "minimum": 1
          },
          "previewDurationSeconds": {
            "type": "integer",
            "minimum": 0
          },
          "restDurationSeconds": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "weeks": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["weekNumber", "days"],
        "properties": {
          "weekNumber": {
            "type": "integer",
            "minimum": 1
          },
          "days": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["weekday", "activities"],
              "properties": {
                "weekday": {
                  "type": "string",
                  "enum": [
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday"
                  ]
                },
                "date": {
                  "type": "string"
                },
                "activities": {
                  "type": "array",
                  "minItems": 1,
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["name", "sport", "exercises"],
                    "properties": {
                      "name": {
                        "type": "string"
                      },
                      "sport": {
                        "type": "string"
                      },
                      "intensity": {
                        "type": "string"
                      },
                      "notes": {
                        "type": "string"
                      },
                      "plannedDurationMinutes": {
                        "type": "integer",
                        "minimum": 1
                      },
                      "plannedDistanceKm": {
                        "type": "number",
                        "minimum": 0
                      },
                      "exercises": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                          "type": "object",
                          "additionalProperties": false,
                          "required": ["exerciseId"],
                          "properties": {
                            "exerciseId": {
                              "type": "string"
                            },
                            "rounds": {
                              "type": "integer",
                              "minimum": 1
                            },
                            "durationSeconds": {
                              "type": "integer",
                              "minimum": 1
                            },
                            "restSeconds": {
                              "type": "integer",
                              "minimum": 0
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "notificationRules": {
      "type": "array"
    },
    "bodyMeasurements": {
      "type": "array"
    }
  }
}
```

## Notification Rule Shape

Although the OpenAI schema currently accepts `notificationRules` as an array, the app expects each item to follow this structure:

```json
{
  "id": "running_reminder",
  "kind": "sport_specific",
  "label": "Running reminder",
  "enabled": true,
  "time": "06:45",
  "sports": ["running"],
  "weekdays": ["monday"],
  "message": "{activity} starts soon.",
  "leadTimeMinutes": 30
}
```

Supported `kind` values:

```text
daily
weekday
rest_period
sport_specific
```

## Body Measurement Shape

```json
{
  "measuredAt": "2026-08-02",
  "weightKg": 78.4,
  "bmi": 23.8,
  "bodyFatPercent": 17.5,
  "waistCm": 84,
  "hipCm": 96,
  "chestCm": 102,
  "armCm": 34,
  "thighCm": 57,
  "restingHeartRate": 49,
  "vo2Max": 53
}
```

## Prompt Requirements

OpenAI must be instructed to:

- Return JSON only.
- Use `version: "1.0"`.
- Use ISO dates in `YYYY-MM-DD`.
- Use only supported sports and weekdays.
- Reference existing catalog IDs where possible.
- Define only missing exercises in `exerciseCatalog` or `exercises`.
- Include preview durations and media URLs whenever possible.
- Avoid prose, markdown, comments, or code fences in the response.

## Exercise Catalog Output

The separate catalog extension endpoint must return this shape:

```json
{
  "items": [
    {
      "id": "bodyweight_squat",
      "name": "Bodyweight squat",
      "sport": "strength",
      "muscles": ["quads", "glutes", "core"],
      "description": "Controlled squat pattern for general strength.",
      "imageUrl": "https://example.com/bodyweight-squat.jpg",
      "videoUrl": "https://example.com/bodyweight-squat.mp4",
      "defaultDurationSeconds": 40,
      "previewDurationSeconds": 10,
      "restDurationSeconds": 20
    }
  ]
}
```

Catalog output is validated by `parseExerciseCatalogJson()` before it can be merged into the local IndexedDB catalog.
