"use client";
import { useFormStatus } from "react-dom";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { Button, type BtnVariant } from "./ui";

export type FormState = { ok?: boolean; error?: string; message?: string; link?: string } | undefined;

const PendingContext = createContext<boolean | null>(null);

/**
 * Like useActionState, but submits via onSubmit so React doesn't clear the form afterwards.
 * If the server returns an error, everything the person typed is still there.
 */
export function useKeepAction(action: (prev: FormState, fd: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending };
}

export function PendingProvider({ pending, children }: { pending: boolean; children: ReactNode }) {
  return <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>;
}

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
  const status = useFormStatus();
  const ctx = useContext(PendingContext);
  const pending = ctx ?? status.pending;
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
  const { state, onSubmit, pending } = useKeepAction(action);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    }
  }, [state, resetOnSuccess, onSuccess]);
  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      <PendingProvider pending={pending}>
        {children}
        <FormMessage state={state} />
      </PendingProvider>
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
