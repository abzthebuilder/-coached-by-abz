import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/ui";
import { CoachNav } from "@/components/coach-nav";

export const dynamic = "force-dynamic";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const coach = await requireCoach();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/coach" className="flex items-center gap-2">
            <Logo className="text-lg" />
            <span className="rounded-md bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink">Coach</span>
          </Link>
          <CoachNav variant="top" />
          <form action={logoutAction} className="flex items-center gap-3">
            <span className="hidden text-sm text-mute lg:inline">{coach.name}</span>
            <button className="min-h-11 px-2 text-sm text-mute hover:text-bone">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 md:pb-12">{children}</main>
      <CoachNav variant="bottom" />
    </div>
  );
}
