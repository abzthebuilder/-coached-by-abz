import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { communityFor } from "@/lib/community";
import { getObject } from "@/lib/storage";

// Community photos: only for members of that community (not removed) and its coach.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const user = await getCurrentUser();
  const ctx = user ? await communityFor(user) : null;
  if (!ctx?.canRead) return notFound();
  const { id } = await params;
  const msg = await db.communityMessage.findFirst({ where: { id, coachId: ctx.coachId }, select: { imageKey: true } });
  if (!msg?.imageKey) return notFound();
  const body = await getObject(msg.imageKey);
  if (!body) return notFound();
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
