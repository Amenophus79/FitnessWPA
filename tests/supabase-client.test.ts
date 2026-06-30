import { describe, expect, it } from "vitest";
import { isSupabaseConfigured } from "@/supabase/client";

describe("optional Supabase configuration", () => {
  it("reports unconfigured when Supabase environment values are empty", () => {
    expect(
      isSupabaseConfigured({
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ""
      })
    ).toBe(false);
  });

  it("reports configured when both Supabase environment values are present", () => {
    expect(
      isSupabaseConfigured({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key"
      })
    ).toBe(true);
  });
});
