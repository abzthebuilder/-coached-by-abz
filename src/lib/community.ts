import "server-only";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { REACTIONS } from "@/content/community";
import crypto from "node:crypto";
import sharp from "sharp";
import { deleteObject, putObject, sniffImage } from "./storage";
import { sendPush } from "./push";

export type ChatMessage = {
  id: string;
  body: string;
  at: string; // ISO
  author: string;
  authorIsCoach: boolean;
  mine: boolean;
  pinned: boolean;
  image: { url: string; w: number | null; h: number | null } | null;
  reactions: { emoji: string; count: number; mine: boolean }[];
  reports?: number; // coach only
};

export type CommunityContext = {
  coachId: string;
  isCoach: boolean;
  member: Awaited<ReturnType<typeof db.communityMember.findUnique>>;
  canRead: boolean;
};

/** Which community this user belongs to, and whether they can read it. Clients must have joined and not been removed. */
export async function communityFor(user: CurrentUser): Promise<CommunityContext | null> {
  if (user.role === "COACH") {
    const member = await db.communityMember.upsert({
      where: { userId: user.id },
      // lastReadAt starts at the beginning so any messages already there count as unread.
      create: { userId: user.id, coachId: user.id, displayName: user.name, lastReadAt: new Date(0) },
      update: {},
    });
    return { coachId: user.id, isCoach: true, member, canRead: true };
  }
  const coachId = user.clientProfile?.coachId;
  if (!coachId) return null;
  const found = await db.communityMember.findUnique({ where: { userId: user.id } });
  const member = found && found.coachId === coachId ? found : null;
  return { coachId, isCoach: false, member, canRead: !!member && !member.removedAt };
}

const include = {
  author: { select: { id: true, role: true, communityMember: { select: { displayName: true } } } },
  reactions: { select: { emoji: true, userId: true } },
  _count: { select: { reports: true } },
} as const;

type Row = Awaited<ReturnType<typeof db.communityMessage.findMany<{ include: typeof include }>>>[number];

function toChat(m: Row, viewerId: string, isCoach: boolean): ChatMessage {
  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const r of m.reactions) {
    const c = counts.get(r.emoji) ?? { count: 0, mine: false };
    c.count++;
    if (r.userId === viewerId) c.mine = true;
    counts.set(r.emoji, c);
  }
  return {
    id: m.id,
    body: m.body,
    at: m.createdAt.toISOString(),
    author: m.author.communityMember?.displayName || "Member",
    authorIsCoach: m.author.role === "COACH",
    mine: m.author.id === viewerId,
    pinned: !!m.pinnedAt,
    image: m.imageKey ? { url: `/api/community/photos/${m.id}`, w: m.imageW, h: m.imageH } : null,
    reactions: REACTIONS.filter((e) => counts.has(e)).map((e) => ({ emoji: e, ...counts.get(e)! })),
    ...(isCoach ? { reports: m._count.reports } : {}),
  };
}

/** Messages from `from` onwards (the window the chat already shows), or the latest page before `before`. */
export async function loadMessages(ctx: CommunityContext, viewerId: string, opts: { from?: Date; before?: Date; limit?: number } = {}) {
  const limit = Math.min(opts.limit ?? 50, 300);
  let rows: Row[];
  if (opts.from) {
    rows = await db.communityMessage.findMany({
      where: { coachId: ctx.coachId, createdAt: { gte: opts.from } },
      orderBy: { createdAt: "asc" },
      take: 300,
      include,
    });
  } else {
    rows = (
      await db.communityMessage.findMany({
        where: { coachId: ctx.coachId, ...(opts.before ? { createdAt: { lt: opts.before } } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit,
        include,
      })
    ).reverse();
  }
  const pinnedRow = await db.communityMessage.findFirst({
    where: { coachId: ctx.coachId, pinnedAt: { not: null } },
    orderBy: { pinnedAt: "desc" },
    include,
  });
  return {
    messages: rows.map((m) => toChat(m, viewerId, ctx.isCoach)),
    pinned: pinnedRow ? toChat(pinnedRow, viewerId, ctx.isCoach) : null,
    hasEarlier: !opts.from && rows.length === limit,
  };
}

export async function markRead(memberId: string) {
  await db.communityMember.update({ where: { id: memberId }, data: { lastReadAt: new Date() } });
}

/** Unread messages for the header badge (0 if not a member). */
export async function unreadCount(userId: string): Promise<number> {
  const m = await db.communityMember.findUnique({ where: { userId } });
  if (!m || m.removedAt) return 0;
  return db.communityMessage.count({ where: { coachId: m.coachId, createdAt: { gt: m.lastReadAt }, authorId: { not: userId } } });
}

// Simple flood protection: at most 8 messages per 20 seconds per person (single server).
const recent = new Map<string, number[]>();
export function postingTooFast(userId: string): boolean {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 20_000);
  if (list.length >= 8) {
    recent.set(userId, list);
    return true;
  }
  list.push(now);
  recent.set(userId, list);
  return false;
}

export function defaultDisplayName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.pop();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export class PhotoError extends Error {}

/**
 * Checks a community photo is a real image, then re-saves it: turned the right way up, at most 1600 px,
 * as JPEG, with all hidden details (location, camera, date) removed. Stored privately.
 */
export async function storeCommunityPhoto(coachId: string, file: File) {
  if (file.size > 12 * 1024 * 1024) throw new PhotoError("That photo is too big. Try a smaller one.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffImage(buf)) throw new PhotoError("Send a JPG, PNG or WebP photo.");
  const out = await sharp(buf, { failOn: "error" })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true })
    .catch(() => {
      throw new PhotoError("That photo couldn't be opened. Try a different one.");
    });
  const key = `community/${coachId}/${crypto.randomUUID()}.jpg`;
  await putObject(key, out.data, "image/jpeg");
  return { key, w: out.info.width, h: out.info.height };
}

/** Deletes the stored photo files of the given messages (call before or after deleting the rows). */
export async function deleteCommunityPhotos(keys: (string | null)[]) {
  for (const k of keys) if (k) await deleteObject(k);
}

/** Notifies community members about a new message, following each person's choice (all / ABZ only / off). */
export async function notifyCommunityMessage(coachId: string, authorId: string, body: string, hasPhoto: boolean) {
  const [author, members] = await Promise.all([
    db.communityMember.findUnique({ where: { userId: authorId }, include: { user: { select: { role: true } } } }),
    db.communityMember.findMany({ where: { coachId, removedAt: null, userId: { not: authorId }, notify: { not: "off" } } }),
  ]);
  if (!author) return;
  const fromCoach = author.user.role === "COACH";
  const recipients = members
    .filter((m) => m.notify === "all" || (m.notify === "coach" && fromCoach))
    .map((m) => ({ userId: m.userId, url: m.userId === coachId ? "/coach/community" : "/app/community" }));
  const text = body.replace(/\s+/g, " ").trim();
  const preview = text ? (text.length > 120 ? `${text.slice(0, 117)}…` : text) : "";
  await sendPush(recipients, {
    title: `${author.displayName}${fromCoach ? " (Coach)" : ""}`,
    body: hasPhoto ? `📷 ${preview || "Photo"}` : preview,
    tag: "community",
  });
}
