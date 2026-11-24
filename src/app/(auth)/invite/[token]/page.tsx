import { db } from "@/lib/db";
import { sha256 } from "@/lib/auth";
import { acceptInviteAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/ui";
import { TimezoneInput } from "@/components/timezone-input";

export const metadata = { title: "Set up your account" };

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  const valid = invite && invite.kind === "INVITE" && !invite.usedAt && invite.expiresAt > new Date();
  if (!valid)
    return (
      <div>
        <h1 className="font-display text-4xl uppercase">Invite expired</h1>
        <p className="mt-3 text-mute">This link has expired or has already been used. Ask your coach to send a new one.</p>
      </div>
    );
  return (
    <div>
      <div className="eyebrow mb-2">Welcome to the team</div>
      <h1 className="font-display text-5xl uppercase leading-none">Set up your account</h1>
      <p className="mt-3 text-mute">
        Create a password for <span className="text-bone">{invite.email}</span>. You&apos;ll use it to log in to your portal.
      </p>
      <ActionForm action={acceptInviteAction} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />
        <TimezoneInput />
        <Field label="Your name">
          <input className="field" name="name" defaultValue={invite.name} autoComplete="name" required />
        </Field>
        <Field label="Password" hint="At least 10 characters.">
          <input className="field" type="password" name="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Confirm password">
          <input className="field" type="password" name="confirm" autoComplete="new-password" minLength={10} required />
        </Field>
        <label className="flex gap-3 rounded-xl border border-line bg-char p-4 text-sm text-mute">
          <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#d4af37]" />
          <span>
            I&apos;m 18 or over, I&apos;ve read the{" "}
            <a href="/privacy" target="_blank" rel="noopener" className="text-gold underline underline-offset-4">
              privacy policy
            </a>
            , and I agree to Coached by ABZ storing and using my health information (such as my weight, measurements,
            check-ins and progress photos) to coach me.
          </span>
        </label>
        <SubmitButton pendingText="Creating account…" className="w-full">
          Create my account
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
