import { describe, expect, it, vi } from "vitest";
import { notifyDue, scheduleNotifications } from "@/notifications/notification-engine";
import type { Activity, NotificationRule } from "@/types/domain";

const activity: Activity & { date: string; weekday: "monday" } = {
  id: "activity_1",
  planId: "plan_1",
  dayId: "day_1",
  name: "Easy run",
  sport: "running",
  exercises: [],
  date: "2026-08-03",
  weekday: "monday"
};

const rule: NotificationRule = {
  id: "rule_1",
  kind: "sport_specific",
  label: "Running reminder",
  enabled: true,
  time: "07:00",
  sports: ["running"],
  message: "{activity} soon",
  leadTimeMinutes: 15
};

describe("notification engine", () => {
  it("schedules sport-specific reminders with lead time", () => {
    const [scheduled] = scheduleNotifications([rule], [activity]);
    expect(scheduled?.scheduledFor).toContain("2026-08-03T");
    expect(scheduled?.body).toBe("Easy run soon");
  });

  it("sends due notifications through the port", () => {
    const scheduled = scheduleNotifications([rule], [activity]);
    const port = {
      permission: "granted" as NotificationPermission,
      requestPermission: vi.fn(),
      show: vi.fn()
    };
    const due = notifyDue(scheduled, port, new Date("2026-08-03T05:00:00.000Z"));
    expect(due).toHaveLength(1);
    expect(port.show).toHaveBeenCalledOnce();
  });
});
