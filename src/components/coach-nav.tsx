"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const ITEMS = [
  { href: "/coach", label: "Clients", d: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" },
  { href: "/coach/check-ins", label: "Check-ins", d: "M5 4h14v16l-3-2-3 2-3-2-3 2-2-1.3V4ZM9 9h6M9 13h4" },
  { href: "/coach/templates", label: "Templates", d: "M3 10v4M6 7v10M9 12h6M18 7v10M21 10v4M6 12h3M15 12h3" },
  { href: "/coach/settings", label: "Settings", d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" },
];

export function CoachNav({ variant }: { variant: "top" | "bottom" }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/coach" ? path === "/coach" || path.startsWith("/coach/clients") : path.startsWith(href));
  if (variant === "top")
    return (
      <nav aria-label="Coach" className="hidden flex-1 justify-center gap-1 md:flex">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} aria-current={isActive(i.href) ? "page" : undefined} className={cx("rounded-lg px-3 py-2 text-sm font-semibold", isActive(i.href) ? "bg-gold/10 text-gold" : "text-mute hover:text-bone")}>
            {i.label}
          </Link>
        ))}
      </nav>
    );
  return (
    <nav aria-label="Coach" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-4">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={isActive(i.href) ? "page" : undefined} className={cx("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", isActive(i.href) ? "text-gold" : "text-mute")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={i.d} />
              </svg>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
