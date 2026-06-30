"use client";

import { Bell, BellRing } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ensureNotificationPermission, scheduleNotifications } from "@/notifications/notification-engine";
import type { NotificationRule, Plan } from "@/types/domain";

export function NotificationPanel({ plan }: { plan: Plan }) {
  const [rules, setRules] = useState<NotificationRule[]>(plan.notificationRules);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const activities = useMemo(
    () =>
      plan.weeks.flatMap((week) =>
        week.days.flatMap((day) =>
          day.activities.map((activity) => ({
            ...activity,
            date: day.date,
            weekday: day.weekday
          }))
        )
      ),
    [plan]
  );
  const scheduled = useMemo(() => scheduleNotifications(rules, activities), [activities, rules]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Rules for this plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted p-3">
          <div className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" aria-hidden />
            Browser permission: <Badge>{permission}</Badge>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              setPermission(await ensureNotificationPermission());
            }}
          >
            <BellRing className="h-4 w-4" aria-hidden />
            Enable
          </Button>
        </div>
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{rule.label}</p>
                <p className="text-xs text-muted-foreground">{rule.message}</p>
              </div>
              <Switch
                checked={rule.enabled}
                onCheckedChange={(enabled) =>
                  setRules((current) => current.map((item) => (item.id === rule.id ? { ...item, enabled } : item)))
                }
              />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{scheduled.length} reminders are scheduled for the loaded plan.</p>
      </CardContent>
    </Card>
  );
}
