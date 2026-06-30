import type { Weekday } from "@/types/domain";

export const weekdays: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / 86_400_000);
}

export function resolveEndDate(startDate: string, endDate?: string, durationDays?: number) {
  if (endDate) {
    return endDate;
  }

  if (!durationDays || durationDays < 1) {
    throw new Error("A positive durationDays value is required when endDate is omitted.");
  }

  return addDays(startDate, durationDays - 1);
}

export function dateForWeekday(startDate: string, weekNumber: number, weekday: Weekday) {
  const offset = (weekNumber - 1) * 7 + weekdays.indexOf(weekday);
  return addDays(startDate, offset);
}
