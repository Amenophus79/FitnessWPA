import path from "node:path";

export function localDataDirectory() {
  return process.env.LOCAL_DATA_DIR || path.join(process.cwd(), "data");
}

export function localStorePath() {
  return path.join(localDataDirectory(), "fitness-pwa.sqlite");
}

export function legacyLocalStorePath() {
  return path.join(localDataDirectory(), "local-store.json");
}
