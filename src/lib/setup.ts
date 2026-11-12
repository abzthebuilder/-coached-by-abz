import "server-only";
import crypto from "node:crypto";
import { db } from "./db";

// One-time coach setup for when you have no terminal (e.g. setting up from a phone).
// Only works while SETUP_TOKEN is set (24+ characters) AND no coach account exists yet.
export function setupTokenConfigured(): boolean {
  return (process.env.SETUP_TOKEN ?? "").length >= 24;
}

export async function setupOpen(): Promise<boolean> {
  if (!setupTokenConfigured()) return false;
  return (await db.user.count({ where: { role: "COACH" } })) === 0;
}

export function setupTokenMatches(given: string): boolean {
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(process.env.SETUP_TOKEN ?? "").digest();
  return setupTokenConfigured() && crypto.timingSafeEqual(a, b);
}
