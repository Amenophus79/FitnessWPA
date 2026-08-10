import { render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("service worker registration", () => {
  it("does not register during the local development deployment", async () => {
    const register = vi.fn();
    vi.stubEnv("NODE_ENV", "development");
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register }
    });
    const { RegisterServiceWorker } = await import("@/app/register-service-worker");

    render(createElement(RegisterServiceWorker));

    expect(register).not.toHaveBeenCalled();
  });

  it("registers the worker for a production deployment", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const register = vi.fn().mockResolvedValue({ update });
    vi.stubEnv("NODE_ENV", "production");
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register }
    });
    const { RegisterServiceWorker } = await import("@/app/register-service-worker");

    render(createElement(RegisterServiceWorker));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith("/sw.js", {
        updateViaCache: "none"
      })
    );
    expect(update).toHaveBeenCalledOnce();
  });

  it("stays inactive when an insecure LAN origin does not expose the service worker API", async () => {
    vi.stubEnv("NODE_ENV", "production");
    Reflect.deleteProperty(navigator, "serviceWorker");
    const { RegisterServiceWorker } = await import("@/app/register-service-worker");

    expect("serviceWorker" in navigator).toBe(false);
    expect(() => render(createElement(RegisterServiceWorker))).not.toThrow();
  });
});
