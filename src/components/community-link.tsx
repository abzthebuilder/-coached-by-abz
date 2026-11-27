"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Header button for the community chat, with an unread count. */
export function CommunityLink({ href, unread: count }: { href: string; unread: number }) {
  // While you're reading the chat, everything is read: no badge.
  const unread = usePathname().startsWith(href) ? 0 : count;
  return (
    <Link
      href={href}
      aria-label={unread ? `Community, ${unread} unread` : "Community"}
      className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl text-mute hover:text-bone"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
      </svg>
      {unread > 0 && (
        <span className="absolute right-0.5 top-1 min-w-5 rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-5 text-ink">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
