import { NextResponse } from "next/server";
import { getScope, UnauthorizedError, ForbiddenError } from "@/lib/tenancy";
export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const days = Math.min(Number(new URL(req.url).searchParams.get("days") ?? 14) || 14, 90);
  try {
    const scope = await getScope();
    return NextResponse.json(await scope.metrics(projectId, days));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "not found" }, { status: 404 });
    throw e;
  }
}