import { getCurrentUser } from "@/lib/auth";
import { buildClientExport, zipResponse } from "@/lib/export";

// A client downloads a copy of their own information. The client id comes from the session, never the URL.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT" || !user.clientProfile) return new Response("Not found", { status: 404 });
  return zipResponse(await buildClientExport(user.clientProfile.id));
}
