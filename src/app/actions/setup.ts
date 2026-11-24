"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword, loginThrottled, passwordProblem, recordLoginFailure } from "@/lib/auth";
import { setupOpen, setupTokenMatches } from "@/lib/setup";
import { DEFAULT_TZ, isValidTimezone } from "@/lib/dates";
import type { FormState } from "@/components/form";

export async function createFirstCoachAction(_: FormState, fd: FormData): Promise<FormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `setup|${ip}`;
  if (loginThrottled(key)) return { error: "Too many attempts. Try again in 15 minutes." };
  if (!(await setupOpen())) return { error: "Setup is closed." };
  if (!setupTokenMatches(String(fd.get("token") ?? ""))) {
    recordLoginFailure(key);
    return { error: "That setup token is wrong." };
  }
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const tzIn = String(fd.get("timezone") ?? "");
  if (!name) return { error: "Enter your name." };
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email." };
  if (password.length < 12) return { error: "Use at least 12 characters for the coach password." };
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "The passwords don't match." };

  const passwordHash = await hashPassword(password);
  const user = await db.$transaction(async (tx) => {
    // Re-check inside the transaction so two simultaneous submissions can't both win.
    if ((await tx.user.count({ where: { role: "COACH" } })) > 0) return null;
    return tx.user.create({
      data: { email, name, passwordHash, role: "COACH", timezone: isValidTimezone(tzIn) ? tzIn : DEFAULT_TZ },
    });
  });
  if (!user) return { error: "Setup is closed." };
  await createSession(user.id);
  redirect("/coach/settings?setup=done");
}
