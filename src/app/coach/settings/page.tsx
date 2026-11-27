import { requireCoach } from "@/lib/auth";
import { getSiteLinks } from "@/lib/settings";
import { saveSiteLinksAction } from "@/app/actions/coach";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, CardTitle, Field, PageHeader } from "@/components/ui";
import { ChangePasswordForm } from "@/components/change-password";
import { NotificationsCard } from "@/components/notifications-card";
import { vapidPublicKey } from "@/lib/push";
import { communityFor } from "@/lib/community";
import { emailSetup } from "@/lib/email";
import { EmailTestButton } from "@/components/email-test";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const coach = await requireCoach();
  const [links, publicKey, community] = await Promise.all([getSiteLinks(), vapidPublicKey(), communityFor(coach)]);
  const sp = await searchParams;
  const mail = emailSetup();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" />
      {sp.setup && (
        <div role="status" className="rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm">
          <strong className="text-gold">Coach account created.</strong> Setup is now closed. Delete the SETUP_TOKEN variable in Railway,
          then check how you&apos;d like people to apply below.
        </div>
      )}
      <Card>
        <CardTitle eyebrow="Public website" title="Application form" />
        <p className="mb-4 text-sm text-mute">Where the Apply for Online Coaching buttons go. Changes go live straight away.</p>
        <ActionForm action={saveSiteLinksAction} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="sr-only">Application form</legend>
            {(
              [
                ["builtin", "Your own form (recommended)", "Applications appear in Leads, with the health questions and consent included."],
                ["tally", "Tally form", "Applications go to Tally. You'll need to invite people by hand."],
              ] as const
            ).map(([value, title, desc]) => (
              <label key={value} className="flex gap-3 rounded-xl border border-line bg-char-2 p-3 has-checked:border-gold">
                <input type="radio" name="applyMode" value={value} defaultChecked={links.applyMode === value} className="mt-1 h-5 w-5 accent-[#d4af37]" />
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-mute">{desc}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Field label="Tally form link (only used if Tally is selected)">
            <input className="field" name="tallyUrl" type="url" defaultValue={links.tallyUrl} placeholder="https://tally.so/r/…" />
          </Field>
          <SubmitButton className="w-full">Save</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <CardTitle eyebrow="This phone" title="Notifications" />
        <p className="mb-3 text-sm text-mute">Get a notification for new applications, check-ins and replies, and community messages.</p>
        <NotificationsCard publicKey={publicKey} communityNotify={(community?.member?.notify as "all" | "coach" | "off") ?? "all"} />
      </Card>
      <Card>
        <CardTitle eyebrow="Website" title="Emails" />
        {mail.on ? (
          <p className="mb-3 text-sm text-mute">
            Invites, password resets, check-in reminders and replies are emailed from <strong className="text-bone break-all">{mail.from}</strong>
            {mail.replyTo && (
              <>
                {" "}
                (replies go to <strong className="text-bone break-all">{mail.replyTo}</strong>)
              </>
            )}
            .
          </p>
        ) : (
          <p className="mb-3 text-sm text-mute">
            Emails are off, so invite and password reset links have to be copied and sent by hand. Turn them on by adding RESEND_API_KEY and EMAIL_FROM
            in Railway.
          </p>
        )}
        {mail.problems.length > 0 && mail.on && (
          <ul className="mb-3 space-y-1 rounded-xl bg-char-2 p-3 text-sm text-warn">
            {mail.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {(mail.on || process.env.EMAIL_DEV_LOG) && <EmailTestButton />}
      </Card>
      <Card>
        <CardTitle eyebrow="Your login" title="Change password" />
        <ChangePasswordForm minLength={12} />
      </Card>
    </div>
  );
}
