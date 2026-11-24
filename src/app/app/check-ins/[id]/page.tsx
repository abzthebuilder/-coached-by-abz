import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDay } from "@/lib/dates";
import { clientReplyAction } from "@/app/actions/client";
import { CheckInSummary, ReplyThread } from "@/components/checkin-view";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, CardTitle, PageHeader } from "@/components/ui";

export default async function CheckInDetail({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireClient();
  const { id } = await params;
  const c = await db.checkIn.findFirst({
    where: { id, clientId: profile.id },
    include: { replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } } },
  });
  if (!c) notFound();
  return (
    <div className="space-y-4">
      <Link href="/app/check-ins" className="text-sm text-mute">← Check-ins</Link>
      <PageHeader eyebrow={c.type === "WEEKLY" ? "Weekly check-in" : "Monthly check-in"} title={fmtDay(c.day, { weekday: true })} />
      <Card>
        <CardTitle title="Conversation" />
        <ReplyThread c={c} viewerRole="CLIENT" />
        {c.replies.length > 0 && (
          <ActionForm action={clientReplyAction} resetOnSuccess className="mt-4 space-y-2">
            <input type="hidden" name="checkInId" value={c.id} />
            <textarea name="body" className="field min-h-20" placeholder="Reply to your coach" aria-label="Reply to your coach" required />
            <SubmitButton variant="ghost" className="w-full" pendingText="Sending…">Send reply</SubmitButton>
          </ActionForm>
        )}
      </Card>
      <Card>
        <CardTitle title="What you sent" />
        <CheckInSummary c={c} />
      </Card>
    </div>
  );
}
