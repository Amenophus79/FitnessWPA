export interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
}

export const promptTemplates: PromptTemplate[] = [
  {
    id: "marathon",
    title: "Marathon preparation",
    prompt:
      "Create a marathon preparation plan using the selected sports only, with weekly progression, recovery days, long-run structure when running is selected, and browser notification rules."
  },
  {
    id: "hyrox",
    title: "Hyrox",
    prompt:
      "Create a Hyrox preparation plan using the selected sports only, with race-specific conditioning, weekly testing, and practical substitutes where needed."
  },
  {
    id: "ultra_running",
    title: "Ultra running",
    prompt:
      "Create an ultra running plan using the selected sports only, with progressive endurance, back-to-back load where appropriate, recovery, and fueling notes."
  },
  {
    id: "strength",
    title: "Strength",
    prompt:
      "Create a strength plan with progressive overload, push, pull, squat, hinge, core, warmups, rest periods, and completion tracking."
  },
  {
    id: "rowing",
    title: "Rowing",
    prompt:
      "Create a rowing plan using the selected sports only, with technique sessions, intervals, zone 2 endurance when rowing is selected, and sport-specific reminders."
  },
  {
    id: "climbing",
    title: "Climbing",
    prompt:
      "Create a climbing plan using the selected sports only, with technique, endurance or power work as appropriate, rest-period reminders, and safe progression."
  },
  {
    id: "bouldering",
    title: "Bouldering",
    prompt:
      "Create a bouldering plan using the selected sports only, with power, technique, fingerboard safety when relevant, and session reminders."
  },
  {
    id: "multi_sport",
    title: "Multi-sport plans",
    prompt:
      "Create a multi-sport plan using the selected sports only, with multiple activities on selected days when useful."
  }
];

export function templatePrompt(id: string) {
  return promptTemplates.find((template) => template.id === id)?.prompt;
}
