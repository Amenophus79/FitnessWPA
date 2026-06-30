import { describe, expect, it } from "vitest";
import { exerciseCatalog, type ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import { mergeExerciseCatalogs, parseExerciseCatalogJson } from "@/exercise-catalog/schema";

const catalogItem = {
  id: "bodyweight_squat",
  name: "Bodyweight squat",
  sport: "strength",
  muscles: ["quads", "glutes"],
  description: "Controlled squat with full foot contact.",
  defaultDurationSeconds: 40,
  previewDurationSeconds: 10,
  restDurationSeconds: 20
} satisfies ExerciseCatalogItem;

describe("exercise catalog schema", () => {
  it("parses a catalog envelope and fills optional media defaults", () => {
    const result = parseExerciseCatalogJson({ items: [catalogItem] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items[0]?.id).toBe("bodyweight_squat");
      expect(result.items[0]?.imageUrl).toContain("https://");
      expect(result.items[0]?.videoUrl).toContain("https://");
    }
  });

  it("parses an array catalog", () => {
    const result = parseExerciseCatalogJson([catalogItem]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toHaveLength(1);
    }
  });

  it("merges catalog items by ID with later items overriding earlier items", () => {
    const merged = mergeExerciseCatalogs([catalogItem], [{ ...catalogItem, name: "Air squat" }]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe("Air squat");
  });

  it("ships the marathon tabata starter exercise database", () => {
    const ids = new Set(exerciseCatalog.map((exercise) => exercise.id));

    expect(ids.has("bodyweight_squat")).toBe(true);
    expect(ids.has("glute_bridge")).toBe(true);
    expect(ids.has("single_leg_rdl_left")).toBe(true);
    expect(ids.has("tibialis_raise")).toBe(true);
    expect(ids.has("progressive_long_run")).toBe(true);
  });
});
