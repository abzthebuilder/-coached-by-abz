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
        <CardTitle eyebrow="Your login" title="Change password" />
        <ChangePasswordForm minLength={12} />
      </Card>
    </div>
  );
}
