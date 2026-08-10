import type { LocalFileStoreSnapshot } from "@/types/local-store";

export interface StoredSnapshot {
  revision: number;
  snapshot: LocalFileStoreSnapshot;
  updatedAt: string;
}

export interface SnapshotStore {
  readonly kind: "sqlite" | "mariadb";
  initialize(): Promise<void>;
  read(): Promise<StoredSnapshot | undefined>;
  write(record: StoredSnapshot): Promise<void>;
  close(): Promise<void>;
}
