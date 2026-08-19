export interface MariaDbConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  source: "environment" | "home-assistant";
}

export interface MariaDbDiscoveryOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface SupervisorMysqlService {
  host?: unknown;
  port?: unknown;
  username?: unknown;
  password?: unknown;
  database?: unknown;
  ssl?: unknown;
}

export async function discoverMariaDb(options: MariaDbDiscoveryOptions = {}): Promise<MariaDbConfig | undefined> {
  const env = options.env ?? process.env;
  const configured = configFromEnvironment(env);

  if (configured) {
    return configured;
  }

  const token = env.SUPERVISOR_TOKEN;
  if (!token) {
    return undefined;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 3_000);

  try {
    const supervisorUrl = (env.SUPERVISOR_URL || "http://supervisor").replace(/\/$/, "");
    const response = await (options.fetchImpl ?? fetch)(`${supervisorUrl}/services/mysql`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      return undefined;
    }

    const responseBody = (await response.json()) as { data?: SupervisorMysqlService } & SupervisorMysqlService;
    const service = responseBody.data ?? responseBody;

    if (
      typeof service.host !== "string" ||
      typeof service.username !== "string" ||
      typeof service.password !== "string"
    ) {
      return undefined;
    }

    return {
      host: service.host,
      port: parsePort(service.port, 3306),
      username: env.MARIADB_USER || service.username,
      password: env.MARIADB_PASSWORD ?? service.password,
      database:
        env.MARIADB_DATABASE || (typeof service.database === "string" ? service.database : "homeassistant"),
      ssl: service.ssl === true,
      source: "home-assistant"
    };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function configFromEnvironment(env: Record<string, string | undefined>): MariaDbConfig | undefined {
  if (!env.MARIADB_HOST || !env.MARIADB_USER || env.MARIADB_PASSWORD === undefined) {
    return undefined;
  }

  return {
    host: env.MARIADB_HOST,
    port: parsePort(env.MARIADB_PORT, 3306),
    username: env.MARIADB_USER,
    password: env.MARIADB_PASSWORD,
    database: env.MARIADB_DATABASE || "homeassistant",
    ssl: env.MARIADB_SSL === "true",
    source: "environment"
  };
}

function parsePort(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : fallback;
}
