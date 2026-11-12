"use client";
import { useFormStatus } from "react-dom";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { Button, type BtnVariant } from "./ui";

export type FormState = { ok?: boolean; error?: string; message?: string; link?: string } | undefined;

export function SubmitButton({
  children,
  pendingText = "Saving…",
  variant = "gold",
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: BtnVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? pendingText : children}
    </Button>
  );
}

/** A form wired to a server action that returns {error|message}. Optionally resets on success. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  onSuccess,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    }
  }, [state, resetOnSuccess, onSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold">
        {state.message}
      </p>
    );
  return null;
}
