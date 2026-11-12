"use client";
import { useCallback, useRef, type ReactNode } from "react";
import { cx } from "./ui";

/** Bottom sheet on phones, centred dialog on larger screens. Uses the native <dialog>. */
export function Sheet({
  trigger,
  title,
  children,
  triggerClassName,
}: {
  trigger: ReactNode;
  title: string;
  children: (close: () => void) => ReactNode;
  triggerClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => ref.current?.close(), []);
  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => e.target === ref.current && close()}
        className={cx(
          "m-0 mt-auto w-full max-w-none rounded-t-3xl border border-line bg-char p-0 text-bone backdrop:bg-black/70",
          "sm:m-auto sm:max-w-md sm:rounded-3xl",
        )}
      >
        <div className="safe-bottom p-5">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl uppercase">{title}</h2>
            <button type="button" onClick={close} className="min-h-11 min-w-11 text-mute" aria-label="Close">
              ✕
            </button>
          </div>
          {children(close)}
        </div>
      </dialog>
    </>
  );
}
