import { getCurrentUser } from "@/lib/auth";
import { communityFor, loadMessages, markRead } from "@/lib/community";

export const dynamic = "force-dynamic";

// The chat polls this every few seconds. Only members (and the coach) of this community get anything back.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const ctx = user ? await communityFor(user) : null;
  if (!user || !ctx || !ctx.canRead || !ctx.member) return Response.json({ error: "Not found" }, { status: 404 });
  const url = new URL(req.url);
  const parse = (v: string | null) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v) : undefined);
  const from = parse(url.searchParams.get("from"));
  const before = parse(url.searchParams.get("before"));
  const data = await loadMessages(ctx, user.id, before ? { before, limit: 30 } : from ? { from } : {});
  if (!before) await markRead(ctx.member.id);
  return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
