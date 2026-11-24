import { resetPasswordAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/ui";

export const metadata = { title: "Reset password" };

export default async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div>
      <h1 className="font-display text-5xl uppercase leading-none">New password</h1>
      <ActionForm action={resetPasswordAction} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="New password" hint="At least 10 characters.">
          <input className="field" type="password" name="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Confirm password">
          <input className="field" type="password" name="confirm" autoComplete="new-password" minLength={10} required />
        </Field>
        <SubmitButton className="w-full">Save password</SubmitButton>
      </ActionForm>
    </div>
  );
}
