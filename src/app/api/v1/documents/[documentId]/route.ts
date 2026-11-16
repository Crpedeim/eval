import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/authenticate-request";

/** Ingestion status. Scoped to the API key's project; anything else is a 404. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const auth = await authenticateApiKey(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "invalid api key" }, { status: 401 });

  const { documentId } = await params;
  const doc = await db.document.findFirst({
    where: { id: documentId, projectId: auth.project.id },
    select: {
      id: true, name: true, kind: true, status: true, sizeBytes: true,
      chunkCount: true, attempts: true, error: true, stats: true, createdAt: true,
    },
  });
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(doc);
}
