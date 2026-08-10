import { legacyLocalStorePath, localStorePath } from "@/storage/local-store-paths";
import {
  defaultLocalFileStoreSnapshot,
  normalizeLocalFileStoreSnapshot
} from "@/storage/local-store-snapshot";
import { SnapshotStoreCoordinator } from "@/storage/snapshot-store-coordinator";
import type { LocalFileStoreSnapshot } from "@/types/local-store";

let coordinatorPromise: Promise<SnapshotStoreCoordinator> | undefined;

export async function initializeLocalStore() {
  await getCoordinator();
}

export async function readLocalFileStore() {
  return (await getCoordinator()).read();
}

export async function writeLocalFileStore(snapshot: LocalFileStoreSnapshot) {
  return (await getCoordinator()).write(snapshot);
}

export async function shutdownLocalStore() {
  const activeCoordinator = coordinatorPromise;
  coordinatorPromise = undefined;

  if (activeCoordinator) {
    await (await activeCoordinator).close();
  }
}

async function getCoordinator() {
  coordinatorPromise ??= createCoordinator();
  return coordinatorPromise;
}

async function createCoordinator() {
  const coordinator = new SnapshotStoreCoordinator();
  await coordinator.initialize();
  return coordinator;
}

export { defaultLocalFileStoreSnapshot, legacyLocalStorePath, localStorePath, normalizeLocalFileStoreSnapshot };
