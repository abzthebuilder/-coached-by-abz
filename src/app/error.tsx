"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl uppercase">Something went wrong</h1>
      <button onClick={reset} className="min-h-12 rounded-xl bg-gold px-5 font-semibold text-ink">Try again</button>
    </div>
  );
}
