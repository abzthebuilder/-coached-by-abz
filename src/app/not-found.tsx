import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="font-display text-7xl text-gold">404</div>
      <p className="text-mute">That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/" className="font-semibold text-gold">Go home</Link>
    </div>
  );
}
