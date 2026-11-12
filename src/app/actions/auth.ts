"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  clearLoginFailures,
  createSession,
  destroySession,
  hashPassword,
  loginThrottled,
  passwordProblem,
  recordLoginFailure,
  sha256,
  verifyPassword,
} from "@/lib/auth";
import { DEFAULT_TZ, isValidTimezone, todayIn } from "@/lib/dates";
import type { FormState } from "@/components/form";

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${email}|${ip}`;
  if (loginThrottled(key)) return { error: "Too many attempts. Try again in 15 minutes." };
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) {
    recordLoginFailure(key);
    return { error: "That email and password don't match." };
  }
  clearLoginFailures(key);
  await createSession(user.id);
  redirect(user.role === "COACH" ? "/coach" : "/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

async function validToken(raw: string, kind: "INVITE" | "RESET") {
  const t = await db.authToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!t || t.kind !== kind || t.usedAt || t.expiresAt < new Date()) return null;
  return t;
}

export async function acceptInviteAction(_: FormState, fd: FormData): Promise<FormState> {
  const raw = String(fd.get("token") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const tzIn = String(fd.get("timezone") ?? "");
  const tz = isValidTimezone(tzIn) ? tzIn : DEFAULT_TZ;

  const invite = await validToken(raw, "INVITE");
  if (!invite) return { error: "This invite link has expired or has already been used. Ask your coach for a new one." };
  if (!name) return { error: "Enter your name." };
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  if (password !== confirm) return { error: "The passwords don't match." };
  if (await db.user.findUnique({ where: { email: invite.email } }))
    return { error: "An account with this email already exists. Try logging in." };

  const passwordHash = await hashPassword(password);
  const user = await db.$transaction(async (tx) => {
    const claimed = await tx.authToken.updateMany({ where: { id: invite.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new Error("Invite already used");
    return tx.user.create({
      data: {
        email: invite.email,
        name,
        passwordHash,
        role: "CLIENT",
        timezone: tz,
        clientProfile: { create: { coachId: invite.coachId, startDay: todayIn(tz) } },
      },
    });
  });
  await createSession(user.id);
  redirect("/app?welcome=1");
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const raw = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const t = await validToken(raw, "RESET");
  if (!t || !t.userId) return { error: "This reset link has expired or has already been used." };
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  if (password !== confirm) return { error: "The passwords don't match." };
  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: t.userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: t.userId } }),
  ]);
  await createSession(t.userId);
  redirect("/app");
}
