import "server-only";
import { headers } from "next/headers";
import { publicBaseUrl } from "./url";

/** The site's address for links: the configured public URL, or else the address this request came in on. */
export async function siteUrl(): Promise<string> {
  const configured = publicBaseUrl();
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
