import type { SupabaseClient } from "@supabase/supabase-js";
import { listSyncQueue, removeSyncItem } from "@/storage/offline-store";
import type { Database } from "@/supabase/client";

export interface SyncResult {
  pushed: number;
  failed: number;
}

export class SyncEngine {
  private abortController?: AbortController;

  constructor(private readonly supabase: SupabaseClient<Database>) {}

  startAutoSync() {
    if (typeof window === "undefined") {
      return;
    }

    const sync = () => {
      if (navigator.onLine) {
        void this.syncPending();
      }
    };

    window.addEventListener("online", sync);
    sync();

    return () => window.removeEventListener("online", sync);
  }

  async syncPending(): Promise<SyncResult> {
    this.abortController?.abort();
    this.abortController = new AbortController();

    const queue = await listSyncQueue();
    let pushed = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        if (item.action === "upsert") {
          await this.upsert(item.entity, item.payload);
        }
        await removeSyncItem(item.id);
        pushed += 1;
      } catch {
        failed += 1;
      }
    }

    return { pushed, failed };
  }

  private async upsert(entity: string, payload: unknown) {
    if (entity === "plan") {
      const plan = payload as { id: string; userId?: string; updatedAt?: string };
      await this.supabase.from("plans").upsert({
        id: plan.id,
        user_id: plan.userId ?? "local",
        data: payload,
        updated_at: plan.updatedAt ?? new Date().toISOString()
      });
      return;
    }

    if (entity === "bodyMeasurement") {
      const measurement = payload as { id: string; userId?: string; measuredAt: string };
      await this.supabase.from("body_measurements").upsert({
        id: measurement.id,
        user_id: measurement.userId ?? "local",
        data: payload,
        measured_at: measurement.measuredAt,
        updated_at: new Date().toISOString()
      });
      return;
    }

    if (entity === "completedExercise") {
      const completed = payload as { exerciseId: string; userId?: string; completedAt: string };
      await this.supabase.from("completed_exercises").upsert({
        id: completed.exerciseId,
        user_id: completed.userId ?? "local",
        data: payload,
        completed_at: completed.completedAt
      });
    }
  }
}
