"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCoach, requireClient, requireUser } from "@/lib/auth";
import { communityFor, postingTooFast } from "@/lib/community";
import { text } from "@/lib/parse";
import { REACTIONS } from "@/content/community";
import type { FormState } from "@/components/form";

type Result = { ok: true } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });

/** The signed-in user's community, only if they're allowed to take part in it. */
async function memberContext() {
  const user = await requireUser();
  const ctx = await communityFor(user);
  if (!ctx || !ctx.canRead || !ctx.member) return null;
  return { user, ctx, member: ctx.member };
}

function cleanName(v: string) {
  return v.replace(/\s+/g, " ").trim().slice(0, 30);
}

export async function joinCommunityAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, profile } = await requireClient();
  const displayName = cleanName(text(fd, "displayName", 60));
  if (displayName.length < 2) return { error: "Choose a name of at least 2 characters." };
  if (fd.get("agree") !== "on") return { error: "Please agree to the community rules to join." };
  const existing = await db.communityMember.findUnique({ where: { userId: user.id } });
  if (existing?.removedAt) return { error: "You can't rejoin the community. Message your coach if you think this is a mistake." };
  await db.communityMember.upsert({
    where: { userId: user.id },
    create: { userId: user.id, coachId: profile.coachId, displayName },
    update: { coachId: profile.coachId, displayName },
  });
  revalidatePath("/app", "layout");
  redirect("/app/community");
}

export async function updateDisplayNameAction(_: FormState, fd: FormData): Promise<FormState> {
  const m = await memberContext();
  if (!m) return { error: "You're not in the community." };
  const displayName = cleanName(text(fd, "displayName", 60));
  if (displayName.length < 2) return { error: "Choose a name of at least 2 characters." };
  await db.communityMember.update({ where: { id: m.member.id }, data: { displayName } });
  revalidatePath("/app/community");
  return { ok: true, message: "Name updated." };
}

/** Leaving deletes the member's messages, reactions and reports too. */
export async function leaveCommunityAction() {
  const { user } = await requireClient();
  const member = await db.communityMember.findUnique({ where: { userId: user.id } });
  if (member && !member.removedAt) {
    await db.$transaction([
      db.communityMessage.deleteMany({ where: { authorId: user.id } }),
      db.communityReaction.deleteMany({ where: { userId: user.id } }),
      db.communityReport.deleteMany({ where: { reporterId: user.id } }),
      db.communityMember.delete({ where: { id: member.id } }),
    ]);
  }
  revalidatePath("/app", "layout");
  redirect("/app/community?left=1");
}

export async function postMessageAction(body: string): Promise<Result> {
  const m = await memberContext();
  if (!m) return no("You're not in the community.");
  const clean = String(body ?? "").replace(/\r\n/g, "\n").trim();
  if (!clean) return no("Write a message first.");
  if (clean.length > 1000) return no("Keep messages under 1,000 characters.");
  if (postingTooFast(m.user.id)) return no("Slow down a little, then try again.");
  await db.communityMessage.create({ data: { coachId: m.ctx.coachId, authorId: m.user.id, body: clean } });
  return { ok: true };
}

/** Members can delete their own messages; the coach can delete any message in their community. */
export async function deleteMessageAction(id: string): Promise<Result> {
  const m = await memberContext();
  if (!m) return no("You're not in the community.");
  const where = m.ctx.isCoach ? { id: String(id), coachId: m.ctx.coachId } : { id: String(id), coachId: m.ctx.coachId, authorId: m.user.id };
  const res = await db.communityMessage.deleteMany({ where });
  return res.count ? { ok: true } : no("Message not found.");
}

export async function toggleReactionAction(id: string, emoji: string): Promise<Result> {
  const m = await memberContext();
  if (!m) return no("You're not in the community.");
  if (!(REACTIONS as readonly string[]).includes(emoji)) return no("Unknown reaction.");
  const msg = await db.communityMessage.findFirst({ where: { id: String(id), coachId: m.ctx.coachId } });
  if (!msg) return no("Message not found.");
  const key = { messageId_userId_emoji: { messageId: msg.id, userId: m.user.id, emoji } };
  if (await db.communityReaction.findUnique({ where: key })) await db.communityReaction.delete({ where: key });
  else await db.communityReaction.create({ data: { messageId: msg.id, userId: m.user.id, emoji } });
  return { ok: true };
}

export async function reportMessageAction(id: string): Promise<Result> {
  const m = await memberContext();
  if (!m) return no("You're not in the community.");
  const msg = await db.communityMessage.findFirst({ where: { id: String(id), coachId: m.ctx.coachId, authorId: { not: m.user.id } } });
  if (!msg) return no("Message not found.");
  await db.communityReport.upsert({
    where: { messageId_reporterId: { messageId: msg.id, reporterId: m.user.id } },
    create: { messageId: msg.id, reporterId: m.user.id },
    update: {},
  });
  return { ok: true };
}

// ---------- Coach only ----------

export async function pinMessageAction(id: string, pin: boolean): Promise<Result> {
  const coach = await requireCoach();
  const msg = await db.communityMessage.findFirst({ where: { id: String(id), coachId: coach.id } });
  if (!msg) return no("Message not found.");
  await db.$transaction([
    db.communityMessage.updateMany({ where: { coachId: coach.id, pinnedAt: { not: null } }, data: { pinnedAt: null } }),
    ...(pin ? [db.communityMessage.update({ where: { id: msg.id }, data: { pinnedAt: new Date() } })] : []),
  ]);
  return { ok: true };
}

export async function dismissReportsAction(fd: FormData) {
  const coach = await requireCoach();
  const msg = await db.communityMessage.findFirst({ where: { id: text(fd, "id", 64), coachId: coach.id } });
  if (msg) await db.communityReport.deleteMany({ where: { messageId: msg.id } });
  revalidatePath("/coach/community");
}

export async function deleteReportedMessageAction(fd: FormData) {
  const coach = await requireCoach();
  await db.communityMessage.deleteMany({ where: { id: text(fd, "id", 64), coachId: coach.id } });
  revalidatePath("/coach/community");
}

export async function setMemberRemovedAction(fd: FormData) {
  const coach = await requireCoach();
  const member = await db.communityMember.findFirst({ where: { id: text(fd, "id", 64), coachId: coach.id, userId: { not: coach.id } } });
  if (!member) return;
  await db.communityMember.update({ where: { id: member.id }, data: { removedAt: fd.get("remove") === "1" ? new Date() : null } });
  revalidatePath("/coach/community");
}
