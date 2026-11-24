import { db } from "@/lib/db";
import { canAccessClient, getCurrentUser } from "@/lib/auth";
import { getObject } from "@/lib/storage";

// Private progress photos. Served only to the client who owns them and their coach.
// Anyone else gets the same 404 as a photo that doesn't exist.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const photo = await db.progressPhoto.findUnique({ where: { id } });
  if (!photo || !(await canAccessClient(user, photo.clientId))) return notFound();
  const body = await getObject(photo.storageKey);
  if (!body) return notFound();
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
