import type { Sport } from "@/types/domain";

export const supportedSports: Sport[] = [
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
];

export function formatSportLabel(sport: Sport) {
  return sport.replaceAll("_", " ");
}
