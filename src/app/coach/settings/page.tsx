import { requireCoach } from "@/lib/auth";
import { getSiteLinks } from "@/lib/settings";
import { saveSiteLinksAction } from "@/app/actions/coach";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, CardTitle, Field, PageHeader } from "@/components/ui";
import { ChangePasswordForm } from "@/components/change-password";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  await requireCoach();
  const links = await getSiteLinks();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" />
      {sp.setup && (
        <div role="status" className="rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm">
          <strong className="text-gold">Coach account created.</strong> Setup is now closed. Delete the SETUP_TOKEN variable in Railway,
          then add your Tally link below.
        </div>
      )}
      <Card>
        <CardTitle eyebrow="Public website" title="Application link" />
        <p className="mb-4 text-sm text-mute">This link powers every Apply for Online Coaching button on the public site. Changes go live straight away.</p>
        <ActionForm action={saveSiteLinksAction} className="space-y-4">
          <Field label="Apply for Online Coaching (Tally form URL)">
            <input className="field" name="tallyUrl" type="url" defaultValue={links.tallyUrl} required />
          </Field>
          <SubmitButton className="w-full">Save link</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <CardTitle eyebrow="Your login" title="Change password" />
        <ChangePasswordForm minLength={12} />
      </Card>
    </div>
  );
}
