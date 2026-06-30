import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/openai/route";

const originalOpenAIKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalOpenAIKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
  }
  vi.unstubAllGlobals();
});

describe("/api/openai optional configuration", () => {
  it("reports whether OpenAI is configured", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await GET();
    const body = (await response.json()) as { configured: boolean };

    expect(response.status).toBe(200);
    expect(body.configured).toBe(false);
  });

  it("reports OpenAI as configured when the local server has an API key", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const response = await GET();
    const body = (await response.json()) as { configured: boolean; model: string };

    expect(response.status).toBe(200);
    expect(body.configured).toBe(true);
    expect(body.model).toBe("gpt-5.2");
  });

  it("does not crash when OpenAI is not configured", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(
      new Request("http://localhost/api/openai", {
        method: "POST",
        body: JSON.stringify({ prompt: "Create a running plan" })
      })
    );
    const body = (await response.json()) as { code: string; configured: boolean };

    expect(response.status).toBe(503);
    expect(body.code).toBe("OPENAI_NOT_CONFIGURED");
    expect(body.configured).toBe(false);
  });

  it("returns valid generated plan JSON after server-side validation", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        expect(body.input[0].content).toContain("Selected sports: running.");
        expect(body.input[0].content).toContain("Only create activities for these sports");

        return {
          ok: true,
          json: async () => ({ output_text: JSON.stringify(validGeneratedPlan) })
        } as Response;
      })
    );

    const response = await POST(
      new Request("http://localhost/api/openai", {
        method: "POST",
        body: JSON.stringify({ prompt: "Create a running plan", sports: ["running"] })
      })
    );
    const body = (await response.json()) as { title: string };

    expect(response.status).toBe(200);
    expect(body.title).toBe("Generated valid plan");
  });

  it("rejects invalid selected sports before calling OpenAI", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/openai", {
        method: "POST",
        body: JSON.stringify({ prompt: "Create a plan", sports: ["running", "marathon_tabata"] })
      })
    );
    const body = (await response.json()) as { code: string; supportedSports: string[] };

    expect(response.status).toBe(400);
    expect(body.code).toBe("INVALID_SELECTED_SPORTS");
    expect(body.supportedSports).toContain("running");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects generated JSON that does not pass the import validator", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({
            output_text: JSON.stringify({
              ...validGeneratedPlan,
              weeks: [
                {
                  weekNumber: 1,
                  days: [
                    {
                      weekday: "monday",
                      activities: [
                        {
                          name: "Broken run",
                          sport: "running",
                          exercises: [{ exerciseId: "missing_exercise" }]
                        }
                      ]
                    }
                  ]
                }
              ]
            })
          })
        } as Response;
      })
    );

    const response = await POST(
      new Request("http://localhost/api/openai", {
        method: "POST",
        body: JSON.stringify({ prompt: "Create a broken running plan" })
      })
    );
    const body = (await response.json()) as { code: string; errors: string[] };

    expect(response.status).toBe(422);
    expect(body.code).toBe("OPENAI_INVALID_PLAN");
    expect(body.errors.join("\n")).toContain("missing_exercise");
  });

  it("accepts generated plans that reference a supplied exercise catalog", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({
            output_text: JSON.stringify({
              version: "1.0",
              title: "Generated catalog-backed plan",
              startDate: "2026-08-03",
              durationDays: 7,
              weeks: [
                {
                  weekNumber: 1,
                  days: [
                    {
                      weekday: "monday",
                      activities: [
                        {
                          name: "Strength",
                          sport: "strength",
                          exercises: [{ exerciseId: "bodyweight_squat" }]
                        }
                      ]
                    }
                  ]
                }
              ]
            })
          })
        } as Response;
      })
    );

    const response = await POST(
      new Request("http://localhost/api/openai", {
        method: "POST",
        body: JSON.stringify({ prompt: "Create a strength plan", catalog: [externalCatalogItem] })
      })
    );
    const body = (await response.json()) as { title: string };

    expect(response.status).toBe(200);
    expect(body.title).toBe("Generated catalog-backed plan");
  });
});

const validGeneratedPlan = {
  version: "1.0",
  title: "Generated valid plan",
  startDate: "2026-08-03",
  durationDays: 7,
  exercises: [
    {
      id: "easy_run",
      name: "Easy run",
      sport: "running",
      muscles: ["legs", "heart", "lungs"],
      description: "Conversational aerobic run.",
      imageUrl: "https://example.com/easy-run.jpg",
      videoUrl: "https://example.com/easy-run.mp4",
      defaultDurationSeconds: 2700,
      previewDurationSeconds: 10,
      restDurationSeconds: 0
    }
  ],
  weeks: [
    {
      weekNumber: 1,
      days: [
        {
          weekday: "monday",
          activities: [
            {
              name: "Easy run",
              sport: "running",
              intensity: "easy",
              plannedDurationMinutes: 45,
              plannedDistanceKm: 8,
              exercises: [{ exerciseId: "easy_run" }]
            }
          ]
        }
      ]
    }
  ],
  notificationRules: [
    {
      id: "running_reminder",
      kind: "sport_specific",
      label: "Running reminder",
      enabled: true,
      time: "06:45",
      sports: ["running"],
      message: "{activity} starts soon.",
      leadTimeMinutes: 30
    }
  ],
  bodyMeasurements: [
    {
      measuredAt: "2026-08-02",
      weightKg: 78.4,
      bmi: 23.8
    }
  ]
};

const externalCatalogItem = {
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
