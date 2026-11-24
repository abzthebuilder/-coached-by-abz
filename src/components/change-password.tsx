import { changePasswordAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "./form";
import { Field } from "./ui";

export function ChangePasswordForm({ minLength }: { minLength: number }) {
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-3">
      <Field label="Current password">
        <input className="field" type="password" name="current" autoComplete="current-password" required />
      </Field>
      <Field label="New password" hint={`At least ${minLength} characters.`}>
        <input className="field" type="password" name="password" autoComplete="new-password" minLength={minLength} required />
      </Field>
      <Field label="Confirm new password">
        <input className="field" type="password" name="confirm" autoComplete="new-password" minLength={minLength} required />
      </Field>
      <SubmitButton variant="ghost" className="w-full">
        Change password
      </SubmitButton>
    </ActionForm>
  );
}
