import Link from "next/link";
import { emailEnabled } from "@/lib/email";
import { forgotPasswordAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Forgot password" };

export default function Forgot() {
  return (
    <div>
      <div className="eyebrow mb-2">Client portal</div>
      <h1 className="font-display text-5xl uppercase leading-none">Forgot password</h1>
      {emailEnabled() ? (
        <>
          <p className="mt-3 text-mute">Enter the email you log in with and I&apos;ll send you a link to choose a new password.</p>
          <ActionForm action={forgotPasswordAction} className="mt-8 space-y-4">
            <Field label="Email">
              <input className="field" type="email" name="email" autoComplete="email" required />
            </Field>
            <SubmitButton pendingText="Sending…" className="w-full">
              Send reset link
            </SubmitButton>
          </ActionForm>
        </>
      ) : (
        <p className="mt-3 text-mute">Message your coach and they&apos;ll send you a link to reset your password.</p>
      )}
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-gold underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
