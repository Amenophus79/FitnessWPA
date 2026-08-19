import { readFile } from "node:fs/promises";

interface HomeAssistantOptions {
  openai_api_key?: unknown;
  openai_model?: unknown;
}

/** Load Home Assistant app options without overriding explicit container env. */
export async function loadHomeAssistantOptions(path = "/data/options.json") {
  try {
    const options = JSON.parse(await readFile(path, "utf8")) as HomeAssistantOptions;
    if (!process.env.OPENAI_API_KEY && typeof options.openai_api_key === "string") {
      process.env.OPENAI_API_KEY = options.openai_api_key;
    }
    if (!process.env.OPENAI_MODEL && typeof options.openai_model === "string" && options.openai_model) {
      process.env.OPENAI_MODEL = options.openai_model;
    }
  } catch {
    // The file is not present in standalone Docker deployments.
  }
}
