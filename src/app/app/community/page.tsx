import { requireClient } from "@/lib/auth";
import { communityFor, defaultDisplayName, loadMessages, markRead } from "@/lib/community";
import { joinCommunityAction, leaveCommunityAction, updateDisplayNameAction } from "@/app/actions/community";
import { COMMUNITY_NAME, COMMUNITY_RULES, COMMUNITY_TAGLINE } from "@/content/community";
import { ChatRoom } from "@/components/chat-room";
import { NotificationsCard } from "@/components/notifications-card";
import { vapidPublicKey } from "@/lib/push";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Community" };

function Rules() {
  return (
    <ul className="space-y-2">
      {COMMUNITY_RULES.map((r) => (
        <li key={r} className="flex gap-3 text-sm text-mute">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
          {r}
        </li>
      ))}
    </ul>
  );
}

export default async function Community({ searchParams }: { searchParams: Promise<{ left?: string }> }) {
  const { user } = await requireClient();
  const sp = await searchParams;
  const ctx = (await communityFor(user))!;

  if (ctx.member?.removedAt)
    return (
      <div>
        <PageHeader title={COMMUNITY_NAME} />
        <Card>
          <p className="text-mute">You&apos;ve been removed from the community. Message your coach if you think this is a mistake.</p>
        </Card>
      </div>
    );

  if (!ctx.canRead || !ctx.member)
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Optional" title={COMMUNITY_NAME}>
          {COMMUNITY_TAGLINE}
        </PageHeader>
        {sp.left && (
          <div role="status" className="rounded-xl bg-gold/10 p-3 text-sm text-gold">
            You&apos;ve left the community and your messages have been deleted.
          </div>
        )}
        <Card>
          <h2 className="mb-3 font-display text-xl uppercase">Community rules</h2>
          <Rules />
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-xl uppercase">Join</h2>
          <ActionForm action={joinCommunityAction} className="space-y-4">
            <Field label="Name other members will see" hint="You can change it later.">
              <input className="field" name="displayName" defaultValue={defaultDisplayName(user.name)} maxLength={30} required />
            </Field>
            <label className="flex gap-3 rounded-xl border border-line bg-char-2 p-4 text-sm text-mute">
              <input type="checkbox" name="agree" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#d4af37]" />
              <span>
                I agree to the community rules, and I understand that other members will see my name and messages. Your logs, photos and
                check-ins always stay private.
              </span>
            </label>
            <SubmitButton className="w-full" pendingText="Joining…">
              Join the community
            </SubmitButton>
          </ActionForm>
        </Card>
      </div>
    );

  const initial = await loadMessages(ctx, user.id);
  await markRead(ctx.member.id);
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <PageHeader eyebrow={`You're ${ctx.member.displayName}`} title={COMMUNITY_NAME} />
        <details className="relative mb-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-xl border border-line px-3 text-sm text-mute">Settings</summary>
          <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-4 rounded-2xl border border-line bg-char p-4 shadow-xl shadow-black/60">
            <ActionForm action={updateDisplayNameAction} className="space-y-2">
              <Field label="Your name in the community">
                <input className="field" name="displayName" defaultValue={ctx.member.displayName} maxLength={30} required />
              </Field>
              <SubmitButton variant="ghost" className="w-full">
                Save name
              </SubmitButton>
            </ActionForm>
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Community rules</summary>
              <div className="mt-2">
                <Rules />
              </div>
            </details>
            <form action={leaveCommunityAction}>
              <button className="min-h-11 w-full rounded-xl border border-warn/50 text-sm font-semibold text-warn">
                Leave and delete my messages
              </button>
            </form>
          </div>
        </details>
      </div>
      <NotificationsCard publicKey={await vapidPublicKey()} compact />
      <ChatRoom initial={initial} isCoach={false} />
    </div>
  );
}
