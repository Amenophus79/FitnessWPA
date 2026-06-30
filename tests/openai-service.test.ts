import { describe, expect, it, vi } from "vitest";
import {
  OpenAIService,
  buildExerciseCatalogInput,
  buildTrainingPlanInput,
  extractOutputText,
  formatExerciseCatalogForPrompt,
  inferRequestedSports,
  selectRelevantExerciseCatalog
} from "@/openai/openai-service";
import { exerciseCatalogJsonSchema } from "@/openai/exercise-catalog-json-schema";
import { trainingPlanJsonSchema } from "@/openai/training-plan-json-schema";
import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";

describe("OpenAIService", () => {
  it("extracts response output text from nested Responses API output", () => {
    expect(
      extractOutputText({
        output: [{ content: [{ type: "output_text", text: "{\"version\":\"1.0\"}" }] }]
      })
    ).toBe("{\"version\":\"1.0\"}");
  });

  it("requests JSON schema output and parses JSON", async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.text.format.type).toBe("json_schema");
      expect(body.text.format.schema).toStrictEqual(trainingPlanJsonSchema);
      expect(body.input[0].content).toContain("Every activity exerciseId must reference an existing catalog ID");
      return {
        ok: true,
        json: async () => ({ output_text: "{\"version\":\"1.0\",\"title\":\"Generated\"}" })
      } as Response;
    });

    const service = new OpenAIService({
      apiKey: "test",
      model: "gpt-5.2",
      schema: trainingPlanJsonSchema,
      fetcher: fetcher as unknown as typeof fetch
    });

    await expect(service.generateTrainingPlanJson("Make a plan")).resolves.toMatchObject({ title: "Generated" });
  });

  it("feeds the model the expected JSON structure and validator constraints", () => {
    const input = buildTrainingPlanInput("Make a plan", "Marathon template", trainingPlanJsonSchema);
    expect(input[0].content).not.toContain("JSON schema:");
    expect(input[0].content).toContain("Return JSON matching the supplied schema.");
    expect(input[0].content).toContain("Provide either endDate or durationDays, never both.");
    expect(input[0].content).toContain("Every activity exerciseId must reference an existing catalog ID");
    expect(input[0].content).toContain("Put every new exercise definition in the root exerciseCatalog array.");
    expect(input[1].content).toContain("Marathon template");
    expect(input[1].content).toContain("Make a plan");
  });

  it("feeds existing exercises to plan generation as authoritative catalog JSON", () => {
    const input = buildTrainingPlanInput("Use squats", undefined, trainingPlanJsonSchema, [
      {
        id: "bodyweight_squat",
        name: "Bodyweight squat",
        sport: "strength",
        muscles: ["quads", "glutes"],
        description: "Controlled squat.",
        imageUrl: "https://example.com/squat.jpg",
        videoUrl: "https://example.com/squat.mp4",
        defaultDurationSeconds: 40,
        previewDurationSeconds: 10,
        restDurationSeconds: 20
      }
    ]);

    expect(input[0].content).toContain("Existing exercise catalog reference JSON:");
    expect(input[0].content).toContain("\"id\":\"bodyweight_squat\"");
    expect(input[0].content).toContain("\"defaultDurationSeconds\":40");
    expect(input[0].content).not.toContain("https://example.com/squat.jpg");
    expect(input[0].content).not.toContain("https://example.com/squat.mp4");
    expect(input[0].content).not.toContain("Controlled squat.");
    expect(input[0].content).toContain("Do not duplicate or redefine an existing catalog exercise");
  });

  it("adds selected sports as explicit generation constraints", () => {
    const input = buildTrainingPlanInput("Create a plan", "Marathon template", trainingPlanJsonSchema, [], [
      "running",
      "strength"
    ]);

    expect(input[0].content).toContain("Selected sports: running, strength.");
    expect(input[0].content).toContain("Only create activities for these sports");
  });

  it("formats missing optional rest duration with the app default", () => {
    expect(
      formatExerciseCatalogForPrompt([
        {
          id: "easy_run",
          name: "Easy run",
          sport: "running",
          muscles: ["legs"],
          description: "Aerobic run.",
          defaultDurationSeconds: 1800,
          previewDurationSeconds: 10
        }
      ])
    ).toContain("\"restDurationSeconds\":0");
  });

  it("filters the exercise catalog to sports requested by prompt or template", () => {
    const catalog: ExerciseCatalogItem[] = [
      {
        id: "easy_run",
        name: "Easy run",
        sport: "running",
        muscles: ["legs"],
        description: "Aerobic run.",
        defaultDurationSeconds: 1800,
        previewDurationSeconds: 10
      },
      {
        id: "row_interval",
        name: "Row interval",
        sport: "rowing",
        muscles: ["legs"],
        description: "Row.",
        defaultDurationSeconds: 120,
        previewDurationSeconds: 10
      }
    ];

    expect(selectRelevantExerciseCatalog(catalog, ["Create a marathon plan"]).map((exercise) => exercise.id)).toStrictEqual([
      "easy_run"
    ]);
    expect(selectRelevantExerciseCatalog(catalog, ["Create a general plan"]).map((exercise) => exercise.id)).toStrictEqual([
      "easy_run",
      "row_interval"
    ]);
    expect(selectRelevantExerciseCatalog(catalog, ["Create a marathon plan"], ["rowing"]).map((exercise) => exercise.id)).toStrictEqual([
      "row_interval"
    ]);
    expect(inferRequestedSports(["Hyrox plan with rowing"]).has("rowing")).toBe(true);
  });

  it("feeds the model the expected exercise catalog JSON structure", () => {
    const input = buildExerciseCatalogInput("Create climbing exercises", exerciseCatalogJsonSchema);

    expect(input[0].content).not.toContain("JSON schema:");
    expect(input[0].content).toContain("Return JSON matching the supplied schema.");
    expect(input[0].content).toContain("Use lowercase snake_case IDs.");
    expect(input[0].content).toContain("Include practical muscles");
    expect(input[1].content).toContain("Create climbing exercises");
  });
});
