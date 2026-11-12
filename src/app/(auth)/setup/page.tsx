import { notFound } from "next/navigation";
import { setupOpen } from "@/lib/setup";
import { createFirstCoachAction } from "@/app/actions/setup";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/ui";
import { TimezoneInput } from "@/components/timezone-input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coach setup", robots: { index: false } };

export default async function Setup() {
  // Disappears (404) once a coach exists or when SETUP_TOKEN isn't set.
  if (!(await setupOpen())) notFound();
  return (
    <div>
      <div className="eyebrow mb-2">One-time setup</div>
      <h1 className="font-display text-5xl uppercase leading-none">Create the coach account</h1>
      <p className="mt-3 text-mute">This page closes for good once the coach account exists.</p>
      <ActionForm action={createFirstCoachAction} className="mt-8 space-y-4">
        <TimezoneInput />
        <Field label="Setup token" hint="The SETUP_TOKEN value from Railway.">
          <input className="field" name="token" type="password" autoComplete="off" required />
        </Field>
        <Field label="Your name">
          <input className="field" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email">
          <input className="field" name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label="Password" hint="At least 12 characters. Let your iPhone suggest a strong password.">
          <input className="field" name="password" type="password" autoComplete="new-password" minLength={12} required />
        </Field>
        <Field label="Confirm password">
          <input className="field" name="confirm" type="password" autoComplete="new-password" minLength={12} required />
        </Field>
        <SubmitButton className="w-full" pendingText="Creating…">Create coach account</SubmitButton>
      </ActionForm>
    </div>
  );
}
