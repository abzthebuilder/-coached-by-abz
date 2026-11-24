import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildClientExport, zipResponse } from "@/lib/export";

// The coach downloads a copy of one of *their* clients' information (e.g. to answer a data request).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user || user.role !== "COACH") return new Response("Not found", { status: 404 });
  const owns = await db.clientProfile.count({ where: { id, coachId: user.id } });
  if (owns !== 1) return new Response("Not found", { status: 404 });
  return zipResponse(await buildClientExport(id));
}
