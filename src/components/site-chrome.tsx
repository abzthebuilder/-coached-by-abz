import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Logo, cx } from "./ui";
import type { SiteLinks } from "@/lib/settings";
import { MobileMenu } from "./mobile-menu";

const NAV = [
  { href: "/coaching", label: "Coaching" },
  { href: "/about", label: "About" },
  { href: "/get-started", label: "Get started" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Coached by ABZ home">
          <Logo className="text-xl" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-mute hover:text-bone">
              {n.label}
            </Link>
          ))}
          <ButtonLink href="/login" variant="outline" className="min-h-10 px-4 text-sm">
            Client Login
          </ButtonLink>
        </nav>
        <MobileMenu items={[...NAV, { href: "/login", label: "Client Login" }]} />
      </div>
    </header>
  );
}

export function CtaButtons({ links, className, stacked }: { links: SiteLinks; className?: string; stacked?: boolean }) {
  return (
    <div className={cx("flex flex-col gap-3", !stacked && "sm:flex-row sm:flex-wrap", className)}>
      <ButtonLink href={links.tallyUrl} external variant="gold">
        Apply for Online Coaching
      </ButtonLink>
      <ButtonLink href={links.calendlyUrl} external variant="outline">
        Book a PT Consultation
      </ButtonLink>
      <ButtonLink href="/login" variant="ghost">
        Client Login
      </ButtonLink>
    </div>
  );
}

export function SiteFooter({ links }: { links: SiteLinks }) {
  return (
    <footer className="border-t border-line/60 bg-char">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <Logo className="text-2xl" />
          <p className="mt-3 max-w-sm text-sm text-mute">
            Online coaching and 1:1 personal training. Build muscle, lose fat, get stronger and feel more confident.
          </p>
        </div>
        <CtaButtons links={links} stacked />
      </div>
      <div className="border-t border-line/60 py-5 text-center text-xs text-faint">
        © {new Date().getFullYear()} Coached by ABZ
      </div>
    </footer>
  );
}

const publicDir = path.join(process.cwd(), "public", "images");

/** Shows one of the coach's own gym photos from /public/images, or a branded panel if it hasn't been added yet. */
export function GymPhoto({
  photo,
  className,
  priority,
  sizes = "(min-width: 768px) 50vw, 100vw",
}: {
  photo: { file: string; alt: string };
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const exists = fs.existsSync(path.join(publicDir, photo.file));
  return (
    <div className={cx("relative overflow-hidden rounded-2xl bg-char-2", className)}>
      {exists ? (
        <Image src={`/images/${photo.file}`} alt={photo.alt} fill priority={priority} sizes={sizes} className="object-cover" />
      ) : (
        <div
          role="img"
          aria-label={photo.alt}
          className="absolute inset-0 flex items-end bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.28),transparent_60%),linear-gradient(160deg,#1c1c1c,#0a0a0a)] p-5"
        >
          <span className="font-display text-6xl uppercase leading-none text-gold/20">ABZ</span>
        </div>
      )}
    </div>
  );
}
