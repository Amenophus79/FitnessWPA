import type { SupabaseClient } from "@supabase/supabase-js";
import { hashPin, verifyPin } from "@/features/auth/pin";
import type { Database } from "@/supabase/client";
import type { Role, User } from "@/types/domain";

const pinStorageKey = "fitness-pwa.pin";

export interface StoredPin {
  userId: string;
  salt: string;
  hash: string;
}

export class AuthService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async loginWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    return data.user ? this.toUser(data.user) : undefined;
  }

  async completeInvitation(password: string, pin: string, role: Role = "adult") {
    const { data, error } = await this.supabase.auth.updateUser({
      password,
      data: { role }
    });
    if (error) {
      throw error;
    }

    if (!data.user?.email) {
      throw new Error("Invitation session is missing a user email.");
    }

    await this.setPin(data.user.id, pin);
    return this.toUser(data.user);
  }

  async inviteByEmail(email: string, redirectTo: string, role: Role = "adult") {
    const { data, error } = await this.supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { role }
    });
    if (error) {
      throw error;
    }

    return data.user ? this.toUser(data.user) : undefined;
  }

  async setPin(userId: string, pin: string) {
    const salt = crypto.randomUUID();
    const storedPin: StoredPin = { userId, salt, hash: await hashPin(pin, salt) };
    localStorage.setItem(pinStorageKey, JSON.stringify(storedPin));
    return storedPin;
  }

  async loginWithPin(pin: string) {
    const raw = localStorage.getItem(pinStorageKey);
    if (!raw) {
      return false;
    }

    const storedPin = JSON.parse(raw) as StoredPin;
    return verifyPin(pin, storedPin.salt, storedPin.hash);
  }

  async logout() {
    await this.supabase.auth.signOut();
  }

  private toUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at?: string }): User {
    const metadata = user.user_metadata ?? {};
    const now = new Date().toISOString();

    return {
      id: user.id,
      email: user.email ?? "",
      displayName: String(metadata.displayName ?? user.email ?? "Athlete"),
      role: (metadata.role as Role | undefined) ?? "adult",
      invitedBy: metadata.invitedBy ? String(metadata.invitedBy) : undefined,
      createdAt: user.created_at ?? now,
      updatedAt: now
    };
  }
}
