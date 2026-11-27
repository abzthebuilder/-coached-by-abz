import { getCurrentUser } from "@/lib/auth";
import { foodByBarcode, foodHit } from "@/lib/food";
import { isBarcode } from "@/lib/food-math";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Barcode lookup: the client's own foods first, then Open Food Facts.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT" || !user.clientProfile) return Response.json({ error: "Not found" }, { status: 404 });
  const { code } = await params;
  if (!isBarcode(code)) return Response.json({ status: "invalid" }, { status: 400 });
  const mine = await db.food.findFirst({ where: { source: "CUSTOM", ownerClientId: user.clientProfile.id, barcode: code } });
  if (mine) return Response.json({ status: "ok", hit: foodHit(mine) });
  const { food, status } = await foodByBarcode(code);
  if (food) return Response.json({ status: "ok", hit: foodHit(food) });
  return Response.json({ status }, { status: status === "busy" ? 503 : 404 });
}
