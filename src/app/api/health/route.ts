import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Used by Railway to decide a deploy is healthy. Reveals nothing beyond up/down.
export async function GET() {
  try {
    // Fails if the database is unreachable OR the tables haven't been created by migrations.
    await db.user.count();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
