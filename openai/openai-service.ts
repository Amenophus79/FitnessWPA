import type { ExerciseCatalogItem } from "@/exercise-catalog/catalog";
import { templatePrompt } from "@/openai/prompt-templates";
import type { Sport } from "@/types/domain";

interface OpenAIServiceOptions {
  apiKey: string;
  model: string;
  schema: unknown;
  schemaName?: string;
  endpoint?: string;
  fetcher?: typeof fetch;
}

export class OpenAIService {
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: OpenAIServiceOptions) {
    this.endpoint = options.endpoint ?? "https://api.openai.com/v1/responses";
    this.fetcher = options.fetcher ?? fetch;
  }

  async generateTrainingPlanJson(prompt: string, templateId?: string, catalog: ExerciseCatalogItem[] = [], sports: Sport[] = []) {
    const template = templateId ? templatePrompt(templateId) : undefined;
    const input = buildTrainingPlanInput(prompt, template, this.options.schema, catalog, sports);
    return this.requestJson(input);
  }

  async generateExerciseCatalogJson(prompt: string) {
    return this.requestJson(buildExerciseCatalogInput(prompt, this.options.schema));
  }

  private async requestJson(input: Array<{ role: string; content: string }>) {
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`
      },
      body: JSON.stringify({
        model: this.options.model,
        input,
        text: {
          format: {
            type: "json_schema",
            name: this.options.schemaName ?? "training_plan",
            schema: this.options.schema,
            strict: false
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as OpenAIResponse;
    const output = extractOutputText(payload);
    return JSON.parse(output) as unknown;
  }
}

export function buildTrainingPlanInput(
  prompt: string,
  template: string | undefined,
  schema: unknown,
  catalog: ExerciseCatalogItem[] = [],
  selectedSports: Sport[] = []
) {
  const catalogBlock = formatExerciseCatalogForPrompt(selectRelevantExerciseCatalog(catalog, [template, prompt], selectedSports));
  const sportInstruction =
    selectedSports.length > 0
      ? `Selected sports: ${selectedSports.join(", ")}. Only create activities for these sports unless the user explicitly asks to change the selection.`
      : "No explicit sport selection was supplied; infer sports from the user prompt.";

  return [
    {
      role: "system",
      content: [
        "You generate JSON-only fitness training plans for an offline-first PWA.",
        "Return only a single JSON object. Do not return markdown, comments, explanations, or code fences.",
        "The JSON must match the provided schema and the app's import validator.",
        "Use version \"1.0\".",
        "Use ISO dates in YYYY-MM-DD format.",
        "Provide either endDate or durationDays, never both.",
        "Every activity exerciseId must reference an existing catalog ID, a root exercises item, or a root exerciseCatalog item.",
        "The existing exercise catalog below is authoritative. Reuse its exercise IDs whenever the movement or sport intent fits.",
        "Do not duplicate or redefine an existing catalog exercise in root exercises or root exerciseCatalog.",
        "Only create a new exercise when no existing catalog item fits the requested movement.",
        "Put every new exercise definition in the root exerciseCatalog array.",
        "Every new exercise must include id, name, sport, muscles, description, imageUrl, videoUrl, defaultDurationSeconds, previewDurationSeconds, and restDurationSeconds.",
        "Use lowercase snake_case IDs for new exercises.",
        "Use only supported sports, weekdays, intensities, and notification kinds from the schema.",
        sportInstruction,
        "The supplied JSON schema is enforced by the API response format; do not infer fields outside it.",
        catalogBlock,
        schema ? "Return JSON matching the supplied schema." : "Return valid training-plan JSON."
      ].join("\n")
    },
    {
      role: "user",
      content: [template, prompt].filter(Boolean).join("\n\n")
    }
  ];
}

export function formatExerciseCatalogForPrompt(catalog: ExerciseCatalogItem[]) {
  if (catalog.length === 0) {
    return "Existing exercise catalog reference JSON: []";
  }

  const normalizedCatalog = catalog.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    sport: exercise.sport,
    muscles: exercise.muscles,
    defaultDurationSeconds: exercise.defaultDurationSeconds,
    previewDurationSeconds: exercise.previewDurationSeconds,
    restDurationSeconds: exercise.restDurationSeconds ?? 0
  }));

  return `Existing exercise catalog reference JSON:\n${JSON.stringify(normalizedCatalog)}`;
}

export function selectRelevantExerciseCatalog(catalog: ExerciseCatalogItem[], context: Array<string | undefined>, selectedSports: Sport[] = []) {
  if (selectedSports.length > 0) {
    const selected = new Set(selectedSports);
    return catalog.filter((exercise) => selected.has(exercise.sport));
  }

  const requestedSports = inferRequestedSports(context);

  if (requestedSports.size === 0) {
    return catalog;
  }

  return catalog.filter((exercise) => expandRequestedSports(requestedSports).has(exercise.sport));
}

export function inferRequestedSports(context: Array<string | undefined>) {
  const text = context.filter(Boolean).join(" ").toLowerCase();
  const sports = new Set<Sport>();

  sportKeywords.forEach(({ sport, keywords }) => {
    if (keywords.some((keyword) => text.includes(keyword))) {
      sports.add(sport);
    }
  });

  return sports;
}

function expandRequestedSports(sports: Set<Sport>) {
  const expanded = new Set(sports);

  if (sports.has("running")) {
    expanded.add("mobility");
  }

  if (sports.has("rock_climbing")) {
    expanded.add("bouldering");
    expanded.add("strength");
    expanded.add("mobility");
  }

  if (sports.has("bouldering")) {
    expanded.add("rock_climbing");
    expanded.add("strength");
    expanded.add("mobility");
  }

  if (sports.has("hiking")) {
    expanded.add("walking");
    expanded.add("mobility");
  }

  return expanded;
}

export function buildExerciseCatalogInput(prompt: string, schema: unknown) {
  return [
    {
      role: "system",
      content: [
        "You generate JSON-only exercise catalog items for an offline-first fitness PWA.",
        "Return only a single JSON object. Do not return markdown, comments, explanations, or code fences.",
        "The JSON must match the provided schema.",
        "Use lowercase snake_case IDs.",
        "Use only supported sports from the schema.",
        "Include practical muscles, description, imageUrl, videoUrl, defaultDurationSeconds, previewDurationSeconds, and restDurationSeconds.",
        "For Tabata exercises, default to 20 seconds work, 10 seconds preview, and 10 seconds rest unless the prompt says otherwise.",
        schema ? "Return JSON matching the supplied schema." : "Return valid exercise-catalog JSON."
      ].join("\n")
    },
    {
      role: "user",
      content: prompt
    }
  ];
}

const sportKeywords: Array<{ sport: Sport; keywords: string[] }> = [
  { sport: "running", keywords: ["running", "run", "runner", "laufen", "lauf", "marathon", "ultra", "5k", "10k", "half marathon", "interval", "sprint"] },
  { sport: "tabata", keywords: ["tabata", "hiit", "interval circuit"] },
  { sport: "strength", keywords: ["strength", "kraft", "push", "pull", "squat", "hinge", "hyrox", "conditioning"] },
  { sport: "mobility", keywords: ["mobility", "beweglichkeit", "stretch", "warmup", "warm-up", "recovery"] },
  { sport: "rowing", keywords: ["rowing", "row", "rudern", "erg", "rower", "hyrox"] },
  { sport: "cycling", keywords: ["cycling", "cycle", "bike", "biking", "radfahren", "rad"] },
  { sport: "swimming", keywords: ["swimming", "swim", "schwimmen"] },
  { sport: "bouldering", keywords: ["bouldering", "boulder", "bouldern"] },
  { sport: "rock_climbing", keywords: ["rock climbing", "climbing", "climb", "klettern"] },
  { sport: "yoga", keywords: ["yoga"] },
  { sport: "walking", keywords: ["walking", "walk", "gehen"] },
  { sport: "hiking", keywords: ["hiking", "hike", "wandern", "ultra"] }
];

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

export function extractOutputText(payload: OpenAIResponse) {
  if (payload.output_text) {
    return payload.output_text;
  }

  const outputText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;

  if (!outputText) {
    throw new Error("OpenAI response did not include output text.");
  }

  return outputText;
}
