import { getCurrentUser } from "@/lib/auth";
import { recentFoods, searchFoods } from "@/lib/food";

export const dynamic = "force-dynamic";

// Food search for the logged-in client: their own foods, the built-in list, then Open Food Facts.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT" || !user.clientProfile) return Response.json({ error: "Not found" }, { status: 404 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ hits: await recentFoods(user.clientProfile.id), offStatus: "skipped" });
  return Response.json(await searchFoods(user.clientProfile.id, q), { headers: { "Cache-Control": "private, no-store" } });
}
