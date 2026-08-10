import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverMariaDb } from "@/storage/mariadb-discovery";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MariaDB discovery", () => {
  it("stays on SQLite outside Home Assistant when no database is configured", async () => {
    const fetchImpl = vi.fn();

    await expect(discoverMariaDb({ env: {}, fetchImpl })).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accepts explicit MariaDB settings for a regular Docker deployment", async () => {
    await expect(
      discoverMariaDb({
        env: {
          MARIADB_HOST: "database",
          MARIADB_PORT: "3307",
          MARIADB_USER: "fitness",
          MARIADB_PASSWORD: "secret",
          MARIADB_DATABASE: "fitness",
          MARIADB_SSL: "true"
        }
      })
    ).resolves.toEqual({
      host: "database",
      port: 3307,
      username: "fitness",
      password: "secret",
      database: "fitness",
      ssl: true,
      source: "environment"
    });
  });

  it("discovers the Home Assistant mysql service with the Supervisor token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: "ok",
          data: {
            host: "core-mariadb",
            port: "3306",
            username: "homeassistant",
            password: "database-secret"
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    await expect(
      discoverMariaDb({
        env: { SUPERVISOR_TOKEN: "supervisor-secret", SUPERVISOR_URL: "http://supervisor/" },
        fetchImpl
      })
    ).resolves.toEqual({
      host: "core-mariadb",
      port: 3306,
      username: "homeassistant",
      password: "database-secret",
      database: "homeassistant",
      ssl: false,
      source: "home-assistant"
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://supervisor/services/mysql",
      expect.objectContaining({
        headers: { Authorization: "Bearer supervisor-secret" },
        cache: "no-store"
      })
    );
  });

  it("falls back cleanly when Home Assistant has no mysql provider", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("Not found", { status: 404 }));

    await expect(
      discoverMariaDb({ env: { SUPERVISOR_TOKEN: "token" }, fetchImpl })
    ).resolves.toBeUndefined();
  });
});
