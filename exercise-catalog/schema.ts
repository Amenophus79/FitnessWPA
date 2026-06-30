import { z } from "zod";
import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";

const sportSchema = z.enum([
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
]);

export const exerciseCatalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sport: sportSchema,
  muscles: z.array(z.string().min(1)).min(1),
  description: z.string().min(1),
  imageUrl: z.string().url().optional().default("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80"),
  videoUrl: z.string().url().optional().default("https://www.youtube.com/results?search_query=exercise+technique"),
  defaultDurationSeconds: z.number().int().positive(),
  previewDurationSeconds: z.number().int().nonnegative(),
  restDurationSeconds: z.number().int().nonnegative().default(0)
});

const exerciseCatalogEnvelopeSchema = z.union([
  z.array(exerciseCatalogItemSchema),
  z.object({ items: z.array(exerciseCatalogItemSchema).min(1) }),
  z.object({ exercises: z.array(exerciseCatalogItemSchema).min(1) }),
  z.object({ exerciseCatalog: z.array(exerciseCatalogItemSchema).min(1) })
]);

export type ExerciseCatalogParseResult =
  | { success: true; items: ExerciseCatalogItem[] }
  | { success: false; errors: string[] };

export function parseExerciseCatalogJson(input: unknown): ExerciseCatalogParseResult {
  const parsed = exerciseCatalogEnvelopeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    };
  }

  if (Array.isArray(parsed.data)) {
    return { success: true, items: parsed.data };
  }

  return {
    success: true,
    items: "items" in parsed.data ? parsed.data.items : "exercises" in parsed.data ? parsed.data.exercises : parsed.data.exerciseCatalog
  };
}

export function mergeExerciseCatalogs(...catalogs: ExerciseCatalogItem[][]) {
  const merged = new Map<string, ExerciseCatalogItem>();
  catalogs.flat().forEach((item) => merged.set(item.id, item));
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}
