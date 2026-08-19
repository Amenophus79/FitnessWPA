import { readFile } from "node:fs/promises";

interface HomeAssistantOptions {
  openai_api_key?: unknown;
  openai_model?: unknown;
  mariadb_user?: unknown;
  mariadb_password?: unknown;
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
    if (!process.env.MARIADB_USER && typeof options.mariadb_user === "string" && options.mariadb_user) {
      process.env.MARIADB_USER = options.mariadb_user;
    }
    if (process.env.MARIADB_PASSWORD === undefined && typeof options.mariadb_password === "string") {
      process.env.MARIADB_PASSWORD = options.mariadb_password;
    }
  } catch {
    // The file is not present in standalone Docker deployments.
  }
}
