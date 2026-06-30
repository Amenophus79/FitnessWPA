import type { Activity, NotificationRule, Weekday } from "@/types/domain";

export interface ScheduledNotification {
  id: string;
  ruleId: string;
  activityId?: string;
  title: string;
  body: string;
  scheduledFor: string;
}

export interface NotificationPort {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  show: (title: string, options?: NotificationOptions) => void;
}

export function createBrowserNotificationPort(): NotificationPort | undefined {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return undefined;
  }

  return {
    permission: Notification.permission,
    requestPermission: () => Notification.requestPermission(),
    show: (title, options) => new Notification(title, options)
  };
}

export async function ensureNotificationPermission(port = createBrowserNotificationPort()) {
  if (!port) {
    return "denied" as NotificationPermission;
  }

  return port.permission === "default" ? port.requestPermission() : port.permission;
}

export function scheduleNotifications(
  rules: NotificationRule[],
  activities: Array<Activity & { date: string; weekday: Weekday }>
): ScheduledNotification[] {
  return rules
    .filter((rule) => rule.enabled)
    .flatMap((rule) =>
      activities
        .filter((activity) => ruleMatchesActivity(rule, activity))
        .map((activity) => {
          const scheduledFor = applyLeadTime(`${activity.date}T${rule.time}:00`, rule.leadTimeMinutes ?? 0);
          return {
            id: `${rule.id}:${activity.id}:${scheduledFor}`,
            ruleId: rule.id,
            activityId: activity.id,
            title: rule.label,
            body: rule.message.replace("{activity}", activity.name).replace("{sport}", activity.sport),
            scheduledFor
          };
        })
    );
}

export function dueNotifications(notifications: ScheduledNotification[], now = new Date()) {
  return notifications.filter((notification) => new Date(notification.scheduledFor).getTime() <= now.getTime());
}

export function notifyDue(
  notifications: ScheduledNotification[],
  port: NotificationPort,
  now = new Date()
) {
  const due = dueNotifications(notifications, now);
  due.forEach((notification) => port.show(notification.title, { body: notification.body, tag: notification.id }));
  return due;
}

function ruleMatchesActivity(rule: NotificationRule, activity: Activity & { weekday: Weekday }) {
  if (rule.kind === "daily") {
    return true;
  }

  if (rule.kind === "weekday") {
    return !rule.weekdays?.length || rule.weekdays.includes(activity.weekday);
  }

  if (rule.kind === "sport_specific") {
    return !rule.sports?.length || rule.sports.includes(activity.sport);
  }

  if (rule.kind === "rest_period") {
    return activity.exercises.some((exercise) => exercise.restDurationSeconds > 0);
  }

  return false;
}

function applyLeadTime(dateTime: string, leadTimeMinutes: number) {
  const date = new Date(dateTime);
  date.setMinutes(date.getMinutes() - leadTimeMinutes);
  return date.toISOString();
}
