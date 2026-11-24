import { CtaButtons, GymPhoto } from "@/components/site-chrome";
import { getSiteLinks } from "@/lib/settings";
import { photos, steps } from "@/content/site";

export const metadata = { title: "Get started" };

export default async function GetStarted() {
  const links = await getSiteLinks();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="eyebrow mb-2">Get started</div>
      <h1 className="font-display text-5xl uppercase leading-none">Ready when you are</h1>
      <p className="mt-4 text-lg text-mute">
        Online coaching starts with a short application so I can understand your goals, your training history and your
        schedule. I&apos;ll get back to you personally.
      </p>
      <GymPhoto photo={photos.banner} optional priority className="mt-8 aspect-[4/5] sm:aspect-[3/2]" sizes="(min-width: 768px) 768px, 100vw" />
      <ol className="mt-10 space-y-4">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-4 rounded-2xl border border-line/70 bg-char p-5">
            <div className="font-display text-4xl text-gold">{s.n}</div>
            <div>
              <h2 className="font-display text-2xl uppercase">{s.title}</h2>
              <p className="mt-1 text-mute">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <CtaButtons links={links} className="mt-8" />
      <p className="mt-6 text-sm text-faint">Already a client? Use Client Login to open your portal.</p>
    </div>
  );
}
