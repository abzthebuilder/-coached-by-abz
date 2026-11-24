import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_55%)] px-4">
      <div className="mx-auto flex h-16 w-full max-w-md items-center">
        <Link href="/" aria-label="Back to Coached by ABZ">
          <Logo className="text-xl" />
        </Link>
      </div>
      <main className="mx-auto w-full max-w-md flex-1 pb-10 pt-6">{children}</main>
      <footer className="pb-8 text-center text-xs text-faint">
        <Link href="/privacy" className="underline underline-offset-4 hover:text-bone">
          Privacy policy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-bone">
          Terms
        </Link>
      </footer>
    </div>
  );
}
