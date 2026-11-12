"use client";
import { useActionState, useState } from "react";
import type { FormState } from "./form";
import { FormMessage, SubmitButton } from "./form";
import { Field } from "./ui";

export function CopyLink({ link, name }: { link: string; name?: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Hi${name ? ` ${name.split(" ")[0]}` : ""}, here's your link to set up your Coached by ABZ account: ${link}`;
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-gold/40 bg-gold/5 p-3">
      <input readOnly value={link} className="field !py-2 text-xs" aria-label="Link" onFocus={(e) => e.target.select()} />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="min-h-11 rounded-xl bg-gold font-semibold text-ink"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          }}
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a className="flex min-h-11 items-center justify-center rounded-xl border border-line font-semibold" href={`sms:?&body=${encodeURIComponent(text)}`}>
          Text it
        </a>
      </div>
    </div>
  );
}

export function LinkActionForm({
  action,
  children,
  submitLabel,
  name,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  children?: React.ReactNode;
  submitLabel: string;
  name?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      {children}
      <SubmitButton className="w-full">{submitLabel}</SubmitButton>
      <FormMessage state={state} />
      {state?.link && <CopyLink link={state.link} name={name} />}
    </form>
  );
}

export function InviteForm({ action }: { action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  return (
    <LinkActionForm action={action} submitLabel="Create invite link">
      <Field label="Client name">
        <input className="field" name="name" required autoComplete="off" />
      </Field>
      <Field label="Client email">
        <input className="field" name="email" type="email" required autoComplete="off" />
      </Field>
    </LinkActionForm>
  );
}
