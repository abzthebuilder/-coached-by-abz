import { db } from "./db";

export type SiteLinks = { tallyUrl: string };

const DEFAULTS: SiteLinks = {
  tallyUrl: process.env.TALLY_URL || "https://tally.so",
};

export async function getSiteLinks(): Promise<SiteLinks> {
  try {
    const rows = await db.siteSetting.findMany({ where: { key: "tallyUrl" } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      tallyUrl: map.tallyUrl || DEFAULTS.tallyUrl,
    };
  } catch {
    return DEFAULTS;
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
