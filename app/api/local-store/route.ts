import { NextResponse } from "next/server";
import { readLocalFileStore, writeLocalFileStore } from "@/storage/local-file-store";
import type { LocalFileStoreSnapshot } from "@/types/local-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await readLocalFileStore());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read local store." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const snapshot = (await request.json()) as LocalFileStoreSnapshot;
    return NextResponse.json(await writeLocalFileStore(snapshot));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not write local store." },
      { status: 500 }
    );
  }
}
