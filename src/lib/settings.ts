import { db } from "./db";

export type ApplyMode = "builtin" | "tally";
export type SiteLinks = {
  /** Where every "Apply for Online Coaching" button goes. */
  applyUrl: string;
  applyExternal: boolean;
  applyMode: ApplyMode;
  tallyUrl: string;
};

const FALLBACK_TALLY = process.env.TALLY_URL || "";

function build(mode: ApplyMode, tallyUrl: string): SiteLinks {
  const useTally = mode === "tally" && isSafeHttpUrl(tallyUrl);
  return { applyMode: useTally ? "tally" : "builtin", applyUrl: useTally ? tallyUrl : "/apply", applyExternal: useTally, tallyUrl };
}

export async function getSiteLinks(): Promise<SiteLinks> {
  try {
    const rows = await db.siteSetting.findMany({ where: { key: { in: ["tallyUrl", "applyMode"] } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return build(map.applyMode === "tally" ? "tally" : "builtin", map.tallyUrl || FALLBACK_TALLY);
  } catch {
    return build("builtin", FALLBACK_TALLY);
  }
}

export function isSafeHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
