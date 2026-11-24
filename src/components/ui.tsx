import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("font-display uppercase tracking-wide leading-none", className)}>
      <span className="text-bone">Coached by </span>
      <span className="text-gold">ABZ</span>
    </span>
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-2xl border border-line/70 bg-char p-4 sm:p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ eyebrow, title, action }: { eyebrow?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="font-display text-xl uppercase leading-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

const btn = {
  base: "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-colors disabled:opacity-50",
  gold: "bg-gold text-ink hover:bg-gold-bright active:bg-gold-dim",
  ghost: "border border-line bg-char-2 text-bone hover:border-gold/60",
  outline: "border border-gold/70 text-gold hover:bg-gold hover:text-ink",
  quiet: "text-mute hover:text-bone",
  danger: "border border-warn/50 text-warn hover:bg-warn hover:text-ink",
};
export type BtnVariant = keyof Omit<typeof btn, "base">;

export function ButtonLink({
  variant = "gold",
  className,
  external,
  ...rest
}: ComponentProps<typeof Link> & { variant?: BtnVariant; external?: boolean }) {
  const ext = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return <Link className={cx(btn.base, btn[variant], className)} {...ext} {...rest} />;
}

export function Button({ variant = "gold", className, ...rest }: ComponentProps<"button"> & { variant?: BtnVariant }) {
  return <button className={cx(btn.base, btn[variant], className)} {...rest} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "gold" | "warn" | "good"; children: ReactNode }) {
  const tones = {
    neutral: "bg-char-3 text-mute",
    gold: "bg-gold/15 text-gold",
    warn: "bg-warn/15 text-warn",
    good: "bg-gold text-ink",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
      <h1 className="font-display text-4xl uppercase leading-none sm:text-5xl">{title}</h1>
      {children && <div className="mt-2 text-mute">{children}</div>}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-mute">{children}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block">
        <span className="label">{label}</span>
        {children}
      </label>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

export function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
