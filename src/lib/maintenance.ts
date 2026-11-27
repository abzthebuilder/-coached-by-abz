import { db } from "./db";

/** Applications that never became clients are deleted 12 months after they were made (as the privacy policy says). */
export async function purgeStaleLeads(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 365 * 86400000);
  const res = await db.lead.deleteMany({ where: { clientId: null, createdAt: { lt: cutoff } } });
  return res.count;
}
