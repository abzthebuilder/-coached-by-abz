"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { submitApplicationAction } from "@/app/actions/apply";
import { FormMessage, PendingProvider, SubmitButton, useKeepAction } from "./form";

/** Wraps the application form: keeps answers if something needs fixing, shows the thank-you page when sent. */
export function ApplyForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { state, onSubmit, pending } = useKeepAction(submitApplicationAction);
  useEffect(() => {
    if (state?.ok) {
      router.push("/apply?sent=1");
      window.scrollTo(0, 0);
    }
  }, [state, router]);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PendingProvider pending={pending}>
        {children}
        <FormMessage state={state} />
        <SubmitButton className="w-full" pendingText="Sending…">
          Send application
        </SubmitButton>
      </PendingProvider>
    </form>
  );
}
