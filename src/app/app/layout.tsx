import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { BottomNav, SideNav } from "@/components/portal-nav";
import { Logo } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireClient();
  // Dot on Check-ins when the coach has replied since the client last posted.
  const latest = await db.checkIn.findFirst({
    where: { clientId: profile.id },
    orderBy: { createdAt: "desc" },
    include: { replies: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const unreadReply = !!latest?.replies[0] && latest.replies[0].authorId !== user.id;
  const items = [
    { href: "/app", label: "Today", icon: "today" as const },
    { href: "/app/training", label: "Training", icon: "training" as const },
    { href: "/app/nutrition", label: "Nutrition", icon: "nutrition" as const },
    { href: "/app/progress", label: "Progress", icon: "progress" as const },
    { href: "/app/check-ins", label: "Check-ins", icon: "checkins" as const, badge: unreadReply },
  ];
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/app">
            <Logo className="text-lg" />
          </Link>
          <form action={logoutAction}>
            <button className="min-h-11 px-2 text-sm text-mute hover:text-bone">Log out</button>
          </form>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-4 md:pt-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-20">
            <div className="mb-4 px-3 text-sm text-mute">{user.name}</div>
            <SideNav items={items} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-28 pt-5 md:pb-12 md:pt-0">{children}</main>
      </div>
      <BottomNav items={items} />
    </div>
  );
}
