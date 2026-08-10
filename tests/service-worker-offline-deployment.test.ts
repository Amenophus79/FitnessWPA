import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const origin = "https://fitness.test";
const serviceWorkerPath = path.join(process.cwd(), "public", "sw.js");
const serviceWorkerSource = readFileSync(serviceWorkerPath, "utf8");
const offlineDocument = "<!doctype html><html><body><main>Fitness PWA</main></body></html>";

type ServiceWorkerRequest = {
  method: string;
  url: string;
  cache?: string;
  destination?: string;
  mode?: string;
};

type ServiceWorkerListener = (event: Record<string, unknown>) => void;

class HarnessRequest implements ServiceWorkerRequest {
  method: string;
  url: string;
  cache?: string;
  destination?: string;
  mode?: string;

  constructor(input: string | ServiceWorkerRequest, init: Partial<ServiceWorkerRequest> = {}) {
    const source = typeof input === "string" ? undefined : input;
    this.url = new URL(typeof input === "string" ? input : input.url, origin).href;
    this.method = init.method ?? source?.method ?? "GET";
    this.cache = init.cache ?? source?.cache;
    this.destination = init.destination ?? source?.destination;
    this.mode = init.mode ?? source?.mode;
  }
}

function createServiceWorkerHarness({
  networkFetch = async () => {
    throw new TypeError("Network connection is unavailable.");
  },
  rejectPrecache = false
}: {
  networkFetch?: (request: ServiceWorkerRequest) => Promise<Response>;
  rejectPrecache?: boolean;
} = {}) {
  const listeners = new Map<string, ServiceWorkerListener>();
  const cacheEntries = new Map<string, Response>();
  const cacheNames = new Set(["unrelated-cache", "fitness-pwa-old-build"]);
  const addedUrls: string[] = [];
  const deletedCacheNames: string[] = [];

  const cache = {
    addAll: vi.fn(async (requests: ServiceWorkerRequest[]) => {
      if (rejectPrecache) {
        throw new TypeError("A required app-shell file could not be downloaded.");
      }

      for (const request of requests) {
        const pathname = new URL(request.url).pathname;
        addedUrls.push(pathname);
        cacheEntries.set(cacheKey(request), createPrecacheResponse(pathname));
      }
    }),
    match: vi.fn(async (request: ServiceWorkerRequest | string) => cacheEntries.get(cacheKey(request))?.clone()),
    put: vi.fn(async (request: ServiceWorkerRequest | string, response: Response) => {
      cacheEntries.set(cacheKey(request), response.clone());
    })
  };

  const caches = {
    open: vi.fn(async (name: string) => {
      cacheNames.add(name);
      return cache;
    }),
    keys: vi.fn(async () => [...cacheNames]),
    delete: vi.fn(async (name: string) => {
      deletedCacheNames.push(name);
      return cacheNames.delete(name);
    })
  };

  const serviceWorkerGlobal = {
    location: { origin },
    addEventListener: vi.fn((type: string, listener: ServiceWorkerListener) => listeners.set(type, listener)),
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) }
  };

  vm.runInNewContext(
    serviceWorkerSource,
    {
      self: serviceWorkerGlobal,
      caches,
      fetch: networkFetch,
      Request: HarnessRequest,
      Response,
      Promise,
      Set,
      URL,
      console
    },
    { filename: "public/sw.js" }
  );

  async function dispatchLifecycleEvent(type: "install" | "activate") {
    const pending: Promise<unknown>[] = [];
    listeners.get(type)?.({
      waitUntil: (promise: Promise<unknown>) => pending.push(Promise.resolve(promise))
    });
    await Promise.all(pending);
  }

  return {
    addedUrls,
    cacheEntries,
    deletedCacheNames,
    skipWaiting: serviceWorkerGlobal.skipWaiting,
    clientsClaim: serviceWorkerGlobal.clients.claim,
    install: () => dispatchLifecycleEvent("install"),
    activate: () => dispatchLifecycleEvent("activate"),
    async fetch(request: ServiceWorkerRequest) {
      let responsePromise: Promise<Response> | undefined;
      listeners.get("fetch")?.({
        request,
        respondWith: (promise: Promise<Response>) => {
          responsePromise = Promise.resolve(promise);
        }
      });
      return responsePromise ? await responsePromise : await networkFetch(request);
    }
  };
}

function cacheKey(request: ServiceWorkerRequest | string) {
  const url = typeof request === "string" ? request : request.url;
  return new URL(url, origin).href;
}

function createPrecacheResponse(pathname: string) {
  if (pathname === "/") {
    return new Response(offlineDocument, { headers: { "content-type": "text/html" } });
  }
  if (pathname.endsWith(".js")) {
    return new Response("globalThis.__fitnessAppLoaded = true;", {
      headers: { "content-type": "application/javascript" }
    });
  }
  if (pathname.endsWith(".css")) {
    return new Response("body { display: block; }", { headers: { "content-type": "text/css" } });
  }
  if (pathname.endsWith(".json") || pathname.endsWith(".webmanifest")) {
    return Response.json({ name: "Fitness PWA" });
  }
  return new Response("image", { headers: { "content-type": "image/png" } });
}

describe("local installed-PWA deployment", () => {
  it("preloads the complete executable app shell for a cold offline launch", async () => {
    const worker = createServiceWorkerHarness();

    await worker.install();

    const scripts = worker.addedUrls.filter((url) => url.endsWith(".js"));
    const styles = worker.addedUrls.filter((url) => url.endsWith(".css"));
    expect(worker.addedUrls).toEqual(
      expect.arrayContaining([
        "/",
        "/manifest.webmanifest",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/icons/apple-touch-icon.png"
      ])
    );
    expect(scripts.length).toBeGreaterThan(0);
    expect(styles.length).toBeGreaterThan(0);

    const documentResponse = await worker.fetch({ method: "GET", mode: "navigate", url: `${origin}/` });
    expect(documentResponse.headers.get("content-type")).toContain("text/html");

    for (const url of [...scripts, ...styles]) {
      const response = await worker.fetch({ method: "GET", url: `${origin}${url}` });
      expect(response.headers.get("content-type")).not.toContain("text/html");
    }
  });

  it("does not activate a partially cached update", async () => {
    const worker = createServiceWorkerHarness({ rejectPrecache: true });

    await expect(worker.install()).rejects.toThrow("required app-shell file");
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it("removes only obsolete Fitness PWA caches after a complete installation", async () => {
    const worker = createServiceWorkerHarness();
    await worker.install();

    await worker.activate();

    expect(worker.deletedCacheNames).toEqual(["fitness-pwa-old-build"]);
    expect(worker.clientsClaim).toHaveBeenCalledOnce();
  });

  it("never substitutes HTML for an uncached script", async () => {
    const worker = createServiceWorkerHarness();
    await worker.install();

    await expect(
      worker.fetch({ method: "GET", url: `${origin}/_next/static/chunks/not-in-this-build.js`, destination: "script" })
    ).rejects.toThrow("Network connection is unavailable");
  });

  it("keeps APIs network-only instead of returning an HTML fallback", async () => {
    const worker = createServiceWorkerHarness();
    await worker.install();

    await expect(worker.fetch({ method: "GET", url: `${origin}/api/local-store` })).rejects.toThrow(
      "Network connection is unavailable"
    );
  });

  it("replays a newly requested static asset during a warm offline launch", async () => {
    let online = true;
    const worker = createServiceWorkerHarness({
      networkFetch: async () => {
        if (!online) {
          throw new TypeError("Network connection is unavailable.");
        }
        return new Response("globalThis.__lazyFeatureLoaded = true;", {
          headers: { "content-type": "application/javascript" }
        });
      }
    });
    await worker.install();

    const request = {
      method: "GET",
      url: `${origin}/_next/static/chunks/lazy-feature.js`,
      destination: "script"
    };
    await worker.fetch(request);
    online = false;
    const offlineResponse = await worker.fetch(request);

    expect(offlineResponse.headers.get("content-type")).toContain("application/javascript");
    await expect(offlineResponse.text()).resolves.toContain("__lazyFeatureLoaded");
  });

  it("does not cache failed static responses", async () => {
    let online = true;
    const worker = createServiceWorkerHarness({
      networkFetch: async () => {
        if (!online) {
          throw new TypeError("Network connection is unavailable.");
        }
        return new Response("missing", { status: 404 });
      }
    });
    await worker.install();

    const request = { method: "GET", url: `${origin}/_next/static/chunks/missing.js`, destination: "script" };
    const missingResponse = await worker.fetch(request);
    online = false;

    expect(missingResponse.status).toBe(404);
    expect(worker.cacheEntries.has(cacheKey(request))).toBe(false);
    await expect(worker.fetch(request)).rejects.toThrow("Network connection is unavailable");
  });
});
