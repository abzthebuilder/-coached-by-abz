import "server-only";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { REACTIONS } from "@/content/community";

export type ChatMessage = {
  id: string;
  body: string;
  at: string; // ISO
  author: string;
  authorIsCoach: boolean;
  mine: boolean;
  pinned: boolean;
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
