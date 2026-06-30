export const exerciseCatalogJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
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
          "imageUrl",
          "videoUrl",
          "defaultDurationSeconds",
          "previewDurationSeconds",
          "restDurationSeconds"
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
          muscles: { type: "array", minItems: 1, items: { type: "string" } },
          description: { type: "string" },
          imageUrl: { type: "string" },
          videoUrl: { type: "string" },
          defaultDurationSeconds: { type: "integer", minimum: 1 },
          previewDurationSeconds: { type: "integer", minimum: 0 },
          restDurationSeconds: { type: "integer", minimum: 0 }
        }
      }
    }
  }
} as const;
