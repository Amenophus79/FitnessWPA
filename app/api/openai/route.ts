import { NextResponse } from "next/server";
import { exerciseCatalog } from "@/exercise-catalog/catalog";
import { mergeExerciseCatalogs, parseExerciseCatalogJson } from "@/exercise-catalog/schema";
import { parseTrainingPlanJson } from "@/features/import/training-plan-schema";
import { OpenAIService } from "@/openai/openai-service";
import { trainingPlanJsonSchema } from "@/openai/training-plan-json-schema";
import type { Sport } from "@/types/domain";
import { supportedSports } from "@/types/sports";

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL ?? "gpt-5.2"
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string; template?: string; catalog?: unknown; sports?: unknown };
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "OpenAI is optional and is not configured.",
        code: "OPENAI_NOT_CONFIGURED",
        configured: false
      },
      { status: 503 }
    );
  }

  const catalog = parseExerciseCatalogJson(body.catalog ?? []);
  if (!catalog.success) {
    return NextResponse.json(
      {
        error: "Exercise catalog is invalid.",
        code: "INVALID_EXERCISE_CATALOG",
        errors: catalog.errors
      },
      { status: 400 }
    );
  }
  const availableCatalog = mergeExerciseCatalogs(exerciseCatalog, catalog.items);
  const selectedSports = parseSelectedSports(body.sports);

  if (!selectedSports.success) {
    return NextResponse.json(
      {
        error: "Selected sports are invalid.",
        code: "INVALID_SELECTED_SPORTS",
        supportedSports
      },
      { status: 400 }
    );
  }

  const service = new OpenAIService({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-5.2",
    schema: trainingPlanJsonSchema,
    schemaName: "training_plan"
  });

  const result = await service.generateTrainingPlanJson(prompt, body.template, availableCatalog, selectedSports.sports);

  const parsed = parseTrainingPlanJson(result, undefined, { catalog: availableCatalog });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "OpenAI generated JSON, but it does not match the training plan import structure.",
        code: "OPENAI_INVALID_PLAN",
        errors: parsed.errors
      },
      { status: 422 }
    );
  }

  return NextResponse.json(result);
}

function parseSelectedSports(input: unknown): { success: true; sports: Sport[] } | { success: false } {
  if (input === undefined) {
    return { success: true, sports: [] };
  }

  if (!Array.isArray(input)) {
    return { success: false };
  }

  const uniqueSports = [...new Set(input)];
  if (!uniqueSports.every((sport): sport is Sport => typeof sport === "string" && supportedSports.includes(sport as Sport))) {
    return { success: false };
  }

  return { success: true, sports: uniqueSports };
}
