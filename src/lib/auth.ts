import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { cache } from "react";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const SESSION_COOKIE = "abz_session";
const SESSION_DAYS = 30;

export function sha256(v: string): string {
  return crypto.createHash("sha256").update(v).digest("hex");
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "That password is too long.";
  return null;
}

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.session.create({ data: { id: sha256(token), userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: { user: { include: { clientProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCoach() {
  const user = await requireUser();
  if (user.role !== "COACH") redirect("/app");
  return user;
}

/** A client and their own profile. Client-side actions never take a client id: it always comes from here. */
export async function requireClient() {
  const user = await requireUser();
  if (user.role !== "CLIENT" || !user.clientProfile) redirect("/coach");
  return { user, profile: user.clientProfile };
}

/** A coach plus one of *their* clients. Anything else is a 404 so ids can't be probed. */
export async function requireCoachedClient(clientId: string) {
  const coach = await requireCoach();
  const profile = await db.clientProfile.findFirst({
    where: { id: clientId, coachId: coach.id },
    include: { user: true },
  });
  if (!profile) notFound();
  return { coach, profile };
}

/** Can this user see this client's records? Used by route handlers (photos). */
export async function canAccessClient(user: CurrentUser, clientId: string): Promise<boolean> {
  if (user.role === "CLIENT") return user.clientProfile?.id === clientId;
  if (user.role === "COACH") {
    const n = await db.clientProfile.count({ where: { id: clientId, coachId: user.id } });
    return n === 1;
  }
  return false;
}

// Very small in-memory login throttle (per email+IP). Good enough for a single instance.
const attempts = new Map<string, { n: number; until: number }>();
export function loginThrottled(key: string): boolean {
  const a = attempts.get(key);
  return !!a && a.n >= 8 && a.until > Date.now();
}
export function recordLoginFailure(key: string) {
  const a = attempts.get(key);
  const until = Date.now() + 15 * 60000;
  attempts.set(key, { n: (a && a.until > Date.now() ? a.n : 0) + 1, until });
}
export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
