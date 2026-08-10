const exerciseSegmentBaseProperties = {
  id: { type: "string" },
  name: { type: "string" },
  kind: {
    type: "string",
    enum: ["warmup", "work", "recovery", "rest", "cooldown", "instruction"]
  },
  durationSeconds: { type: "integer", minimum: 1 },
  distanceKm: { type: "number", minimum: 0 },
  targetPace: { type: "string" },
  targetSpeedKmh: { type: "number", minimum: 0 },
  intensity: {
    type: "string",
    enum: ["recovery", "easy", "moderate", "threshold", "hard", "race"]
  },
  notes: { type: "string" },
  repeat: { type: "integer", minimum: 1 }
} as const;

const nestedExerciseSegmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: exerciseSegmentBaseProperties
} as const;

const exerciseSegmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    ...exerciseSegmentBaseProperties,
    segments: {
      type: "array",
      minItems: 1,
      items: nestedExerciseSegmentJsonSchema
    }
  }
} as const;

export const trainingPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["version", "title", "startDate", "weeks"],
  properties: {
    version: { type: "string", enum: ["1.0"] },
    title: { type: "string" },
    description: { type: "string" },
    startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    endDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    durationDays: { type: "integer", minimum: 1 },
    timezone: { type: "string" },
    exercises: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "name",
          "sport",
          "muscles",
          "description",
          "defaultDurationSeconds",
          "previewDurationSeconds"
        ],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          sport: {
            type: "string",
            enum: [
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
          muscles: { type: "array", items: { type: "string" } },
          description: { type: "string" },
          imageUrl: { type: "string" },
          videoUrl: { type: "string" },
          defaultDurationSeconds: { type: "integer", minimum: 1 },
          previewDurationSeconds: { type: "integer", minimum: 0 },
          restDurationSeconds: { type: "integer", minimum: 0 }
        }
      }
    },
    exerciseCatalog: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "name",
          "sport",
          "muscles",
          "description",
          "defaultDurationSeconds",
          "previewDurationSeconds"
        ],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          sport: {
            type: "string",
            enum: [
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
          muscles: { type: "array", items: { type: "string" } },
          description: { type: "string" },
          imageUrl: { type: "string" },
          videoUrl: { type: "string" },
          defaultDurationSeconds: { type: "integer", minimum: 1 },
          previewDurationSeconds: { type: "integer", minimum: 0 },
          restDurationSeconds: { type: "integer", minimum: 0 }
        }
      }
    },
    weeks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["weekNumber", "days"],
        properties: {
          weekNumber: { type: "integer", minimum: 1 },
          days: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["weekday", "activities"],
              properties: {
                weekday: {
                  type: "string",
                  enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                },
                date: { type: "string" },
                activities: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "sport", "exercises"],
                    properties: {
                      name: { type: "string" },
                      sport: {
                        type: "string",
                        enum: [
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
                      intensity: {
                        type: "string",
                        enum: ["recovery", "easy", "moderate", "threshold", "hard", "race"]
                      },
                      notes: { type: "string" },
                      plannedDurationMinutes: { type: "integer", minimum: 1 },
                      plannedDistanceKm: { type: "number", minimum: 0 },
                      exercises: {
                        type: "array",
                        minItems: 1,
                        items: {
                          type: "object",
                          additionalProperties: false,
                          required: ["exerciseId"],
                          properties: {
                            exerciseId: { type: "string" },
                            rounds: { type: "integer", minimum: 1 },
                            durationSeconds: { type: "integer", minimum: 1 },
                            restSeconds: { type: "integer", minimum: 0 },
                            segments: {
                              type: "array",
                              minItems: 1,
                              items: exerciseSegmentJsonSchema
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
    notificationRules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "label", "enabled", "time", "message"],
        properties: {
          id: { type: "string" },
          kind: { type: "string", enum: ["daily", "weekday", "rest_period", "sport_specific"] },
          label: { type: "string" },
          enabled: { type: "boolean" },
          time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          weekdays: {
            type: "array",
            items: {
              type: "string",
              enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            }
          },
          sports: {
            type: "array",
            items: {
              type: "string",
              enum: [
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
            }
          },
          message: { type: "string" },
          leadTimeMinutes: { type: "integer", minimum: 0 }
        }
      }
    },
    bodyMeasurements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["measuredAt"],
        properties: {
          userId: { type: "string" },
          measuredAt: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          weightKg: { type: "number", minimum: 0 },
          bmi: { type: "number", minimum: 0 },
          bodyFatPercent: { type: "number", minimum: 0, maximum: 100 },
          waistCm: { type: "number", minimum: 0 },
          hipCm: { type: "number", minimum: 0 },
          chestCm: { type: "number", minimum: 0 },
          armCm: { type: "number", minimum: 0 },
          thighCm: { type: "number", minimum: 0 },
          restingHeartRate: { type: "integer", minimum: 0 },
          vo2Max: { type: "number", minimum: 0 }
        }
      }
    }
  }
} as const;
