export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { loadHomeAssistantOptions } = await import("@/runtime-options");
  await loadHomeAssistantOptions();
  const { initializeLocalStore } = await import("@/storage/local-file-store");
  await initializeLocalStore();
}
