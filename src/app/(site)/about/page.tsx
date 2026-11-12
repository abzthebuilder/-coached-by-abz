import { CtaButtons, GymPhoto } from "@/components/site-chrome";
import { getSiteLinks } from "@/lib/settings";
import { outcomes, photos, story } from "@/content/site";

export const metadata = { title: "About" };

export default async function About() {
  const links = await getSiteLinks();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-start">
        <GymPhoto photo={photos.about} priority className="aspect-[4/5] md:sticky md:top-24" />
        <div>
          <div className="eyebrow mb-2">{story.eyebrow}</div>
          <h1 className="font-display text-5xl uppercase leading-none">{story.title}</h1>
          {story.paragraphs.map((p) => (
            <p key={p} className="mt-5 text-lg text-mute">
              {p}
            </p>
          ))}
          <p className="mt-6 font-display text-3xl uppercase text-gold">{story.signoff}</p>

          <h2 className="mt-12 font-display text-3xl uppercase">What I help clients do</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {outcomes.map((o) => (
              <li key={o.title} className="rounded-2xl border border-line/70 bg-char p-4">
                <div className="font-display text-xl uppercase text-gold">{o.title}</div>
                <p className="mt-1 text-sm text-mute">{o.body}</p>
              </li>
            ))}
          </ul>
          <CtaButtons links={links} className="mt-10" />
        </div>
      </div>
    </div>
  );
}
