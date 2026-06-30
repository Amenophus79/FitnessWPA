# Notification Engine Specification

## Purpose

The notification engine converts plan-level reminder rules into browser notification events. It should support daily reminders, weekday reminders, rest-period prompts, and sport-specific reminders without requiring internet access.

Implementation:

```text
notifications/notification-engine.ts
components/dashboard/notification-panel.tsx
tests/notifications.test.ts
```

## Notification Rule Model

```ts
interface NotificationRule {
  id: string;
  kind: "daily" | "weekday" | "rest_period" | "sport_specific";
  label: string;
  enabled: boolean;
  time: string;
  weekdays?: Weekday[];
  sports?: Sport[];
  message: string;
  leadTimeMinutes?: number;
}
```

## Scheduled Notification Model

```ts
interface ScheduledNotification {
  id: string;
  ruleId: string;
  activityId?: string;
  title: string;
  body: string;
  scheduledFor: string;
}
```

## Rule Types

### `daily`

Creates reminders for every activity day.

Use cases:

- Review tomorrow's plan.
- Prepare equipment.
- Fill bottles or nutrition.

### `weekday`

Creates reminders only for configured weekdays.

Use cases:

- Friday long run reminder.
- Sunday mobility reminder.
- Monday interval reminder.

### `sport_specific`

Creates reminders when the activity sport matches the rule sports.

Use cases:

- Running reminder.
- Tabata reminder.
- Rowing reminder.
- Climbing reminder.

### `rest_period`

Creates reminders for activities that include exercises with rest periods.

Use cases:

- Encourage breathing control during Tabata rest.
- Remind users to hydrate between strength rounds.

## Message Templates

Messages may use placeholders:

```text
{activity}
{sport}
```

Example:

```json
{
  "message": "{activity} starts soon. Check shoes, route, and hydration."
}
```

Rendered output:

```text
Progressive long run starts soon. Check shoes, route, and hydration.
```

## Permission Flow

Browser notifications require explicit permission.

Expected flow:

1. Show notification settings in the UI.
2. User clicks enable.
3. Browser permission prompt appears.
4. If permission is granted, due notifications may be shown.
5. If permission is denied, rules remain configurable but no browser notifications are sent.

Permission states:

```text
default
granted
denied
```

## Scheduling Flow

Input:

```text
NotificationRule[]
Activity[] with date and weekday
```

Process:

1. Remove disabled rules.
2. Match rules to activities.
3. Calculate scheduled timestamp from `date`, `time`, and `leadTimeMinutes`.
4. Render title and body.
5. Return deterministic scheduled notification IDs.

ID format:

```text
{ruleId}:{activityId}:{scheduledFor}
```

## Offline Behavior

The scheduler must work from local plan data. It should not require Supabase or OpenAI.

Notification state to persist in future versions:

- rule enablement
- permission status snapshot
- sent notification IDs
- snoozed notification IDs
- quiet-hours settings

## Quiet Hours

Future quiet-hours behavior:

- Do not show notifications between configured local times.
- Move due reminders to the next allowed time.
- Never move race-day or same-day reminders past the activity start.

Example:

```json
{
  "quietHours": {
    "from": "22:00",
    "to": "06:30"
  }
}
```

## Acceptance Criteria

- Disabled rules create no scheduled notifications.
- Sport-specific rules match only configured sports.
- Weekday rules match only configured weekdays.
- Lead time is subtracted from the configured reminder time.
- Notification permission is requested only after user action.
- Due notifications are sent through a notification port for testability.
- Unit tests do not depend on the real browser Notification API.
