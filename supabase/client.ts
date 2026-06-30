import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Database = {
  public: {
    Tables: {
      plans: {
        Row: { id: string; user_id: string; data: unknown; updated_at: string };
        Insert: { id: string; user_id: string; data: unknown; updated_at?: string };
        Update: { data?: unknown; updated_at?: string };
        Relationships: [];
      };
      body_measurements: {
        Row: { id: string; user_id: string; data: unknown; measured_at: string; updated_at: string };
        Insert: { id: string; user_id: string; data: unknown; measured_at: string; updated_at?: string };
        Update: { data?: unknown; measured_at?: string; updated_at?: string };
        Relationships: [];
      };
      completed_exercises: {
        Row: { id: string; user_id: string; data: unknown; completed_at: string };
        Insert: { id: string; user_id: string; data: unknown; completed_at: string };
        Update: { data?: unknown; completed_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let browserClient: SupabaseClient<Database> | undefined;

export function isSupabaseConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getOptionalSupabaseBrowserClient() {
  return isSupabaseConfigured() ? getSupabaseBrowserClient() : undefined;
}

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is optional but not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth and sync."
    );
  }

  browserClient = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return browserClient;
}
