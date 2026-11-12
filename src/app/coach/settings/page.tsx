import { requireCoach } from "@/lib/auth";
import { getSiteLinks } from "@/lib/settings";
import { saveSiteLinksAction } from "@/app/actions/coach";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, CardTitle, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function Settings() {
  await requireCoach();
  const links = await getSiteLinks();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" />
      <Card>
        <CardTitle eyebrow="Public website" title="Button links" />
        <p className="mb-4 text-sm text-mute">These links power the buttons on the public site. Changes go live straight away.</p>
        <ActionForm action={saveSiteLinksAction} className="space-y-4">
          <Field label="Apply for Online Coaching (Tally form URL)">
            <input className="field" name="tallyUrl" type="url" defaultValue={links.tallyUrl} required />
          </Field>
          <Field label="Book a PT Consultation (Calendly URL)">
            <input className="field" name="calendlyUrl" type="url" defaultValue={links.calendlyUrl} required />
          </Field>
          <SubmitButton className="w-full">Save links</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
