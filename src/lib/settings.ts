import { db } from "./db";

export type SiteLinks = { tallyUrl: string; calendlyUrl: string };

const DEFAULTS: SiteLinks = {
  tallyUrl: process.env.TALLY_URL || "https://tally.so",
  calendlyUrl: process.env.CALENDLY_URL || "https://calendly.com",
};

export async function getSiteLinks(): Promise<SiteLinks> {
  try {
    const rows = await db.siteSetting.findMany({ where: { key: { in: ["tallyUrl", "calendlyUrl"] } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      tallyUrl: map.tallyUrl || DEFAULTS.tallyUrl,
      calendlyUrl: map.calendlyUrl || DEFAULTS.calendlyUrl,
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
