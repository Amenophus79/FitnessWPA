import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/openai/exercise-catalog/route";

const originalOpenAIKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalOpenAIKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
  }
  vi.unstubAllGlobals();
});

describe("/api/openai/exercise-catalog optional configuration", () => {
  it("does not crash when OpenAI is not configured", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(
      new Request("http://localhost/api/openai/exercise-catalog", {
        method: "POST",
        body: JSON.stringify({ prompt: "Create strength exercises" })
      })
    );
    const body = (await response.json()) as { code: string; configured: boolean };

    expect(response.status).toBe(503);
    expect(body.code).toBe("OPENAI_NOT_CONFIGURED");
    expect(body.configured).toBe(false);
  });

  it("returns validated catalog items from OpenAI output", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({ output_text: JSON.stringify({ items: [validCatalogItem] }) })
        } as Response;
      })
    );

    const response = await POST(
      new Request("http://localhost/api/openai/exercise-catalog", {
        method: "POST",
        body: JSON.stringify({ prompt: "Create strength exercises" })
      })
    );
    const body = (await response.json()) as { items: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.items[0]?.id).toBe("bodyweight_squat");
  });
});

const validCatalogItem = {
  id: "bodyweight_squat",
  name: "Bodyweight squat",
  sport: "strength",
  muscles: ["quads", "glutes", "core"],
  description: "Controlled squat pattern for general strength.",
  imageUrl: "https://example.com/bodyweight-squat.jpg",
  videoUrl: "https://example.com/bodyweight-squat.mp4",
  defaultDurationSeconds: 40,
  previewDurationSeconds: 10,
  restDurationSeconds: 20
};
