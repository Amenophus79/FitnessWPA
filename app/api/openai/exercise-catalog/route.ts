import { NextResponse } from "next/server";
import { parseExerciseCatalogJson } from "@/exercise-catalog/schema";
import { exerciseCatalogJsonSchema } from "@/openai/exercise-catalog-json-schema";
import { OpenAIService } from "@/openai/openai-service";

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string };
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

  const service = new OpenAIService({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-5.2",
    schema: exerciseCatalogJsonSchema,
    schemaName: "exercise_catalog"
  });

  const result = await service.generateExerciseCatalogJson(prompt);
  const parsed = parseExerciseCatalogJson(result);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "OpenAI generated JSON, but it does not match the exercise catalog structure.",
        code: "OPENAI_INVALID_EXERCISE_CATALOG",
        errors: parsed.errors
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ items: parsed.items });
}
