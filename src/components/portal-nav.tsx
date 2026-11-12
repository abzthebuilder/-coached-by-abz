"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const ICONS: Record<string, React.ReactNode> = {
  today: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" />,
  training: <path d="M3 10v4M6 7v10M9 12h6M18 7v10M21 10v4M6 12h3M15 12h3" />,
  nutrition: <path d="M12 21c-4.4 0-7-3-7-7 0-3.5 2.5-6.5 7-7 4.5.5 7 3.5 7 7 0 4-2.6 7-7 7ZM12 7c0-2 1-3.5 3-4" />,
  progress: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  checkins: <path d="M5 4h14v16l-3-2-3 2-3-2-3 2-2-1.3V4ZM9 9h6M9 13h4" />,
};

export function BottomNav({ items }: { items: { href: string; label: string; icon: keyof typeof ICONS; badge?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((i) => {
          const active = i.href === path || (i.href !== items[0].href && path.startsWith(i.href));
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cx("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-gold" : "text-mute")}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {ICONS[i.icon]}
                </svg>
                {i.label}
                {i.badge && <span className="absolute right-[28%] top-3 h-2 w-2 rounded-full bg-gold" aria-label="needs attention" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav({ items }: { items: { href: string; label: string; icon: keyof typeof ICONS; badge?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="space-y-1">
        {items.map((i) => {
          const active = i.href === path || (i.href !== items[0].href && path.startsWith(i.href));
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                  active ? "bg-gold/10 text-gold" : "text-mute hover:text-bone",
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {ICONS[i.icon]}
                </svg>
                {i.label}
                {i.badge && <span className="ml-auto h-2 w-2 rounded-full bg-gold" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
