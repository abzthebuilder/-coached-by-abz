import Link from "next/link";
import { CtaButtons, GymPhoto, hasPhoto } from "@/components/site-chrome";
import { getSiteLinks } from "@/lib/settings";
import { audiences, expectations, hero, outcomes, photos, services, steps, story } from "@/content/site";

export default async function Home() {
  const links = await getSiteLinks();
  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-12 pt-8 md:grid-cols-2 md:items-center md:pt-16">
          <div>
            <div className="eyebrow mb-4">{hero.eyebrow}</div>
            <h1 className="font-display text-[3.25rem] uppercase leading-[0.95] sm:text-7xl">
              {hero.title.map((t, i) => (
                <span key={t} className={i === hero.title.length - 1 ? "block text-gold" : "block"}>
                  {t}
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-mute">{hero.lead}</p>
            <CtaButtons links={links} className="mt-7" />
          </div>
          <GymPhoto photo={photos.hero} priority className="aspect-[4/5] md:aspect-[4/5]" />
        </div>
      </section>

      {/* Outcomes */}
      <section className="border-y border-line/60 bg-char">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line/60 md:grid-cols-4">
          {outcomes.map((o) => (
            <div key={o.title} className="bg-char p-5">
              <h2 className="font-display text-2xl uppercase text-gold">{o.title}</h2>
              <p className="mt-2 text-sm text-mute">{o.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="eyebrow mb-2">Who I coach</div>
        <h2 className="font-display text-4xl uppercase leading-none">Wherever you&apos;re starting from</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {audiences.map((a, i) => (
            <div key={a.title} className="rounded-2xl border border-line/70 bg-char p-5">
              <div className="font-display text-sm text-gold">0{i + 1}</div>
              <h3 className="mt-1 font-display text-2xl uppercase">{a.title}</h3>
              <p className="mt-2 text-mute">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="bg-char">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center">
          <GymPhoto photo={photos.about} className="aspect-square" />
          <div>
            <div className="eyebrow mb-2">{story.eyebrow}</div>
            <h2 className="font-display text-4xl uppercase leading-none">{story.title}</h2>
            <p className="mt-5 text-mute">{story.paragraphs[0]}</p>
            <p className="mt-4 text-mute">{story.paragraphs[1]}</p>
            <Link href="/about" className="mt-5 inline-block font-semibold text-gold underline-offset-4 hover:underline">
              Read my story →
            </Link>
          </div>
        </div>
      </section>

      {/* Online coaching */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="eyebrow mb-2">How I can help</div>
        <h2 className="font-display text-4xl uppercase leading-none">{services.online.title}</h2>
        <p className="mt-2 text-lg text-gold">{services.online.tagline}</p>
        <article className="mt-8 grid overflow-hidden rounded-2xl border border-line/70 bg-char md:grid-cols-2">
          <GymPhoto photo={photos.online} optional className="aspect-[4/3] rounded-none md:aspect-auto md:min-h-[420px]" />
          <div className="flex flex-col p-5 md:p-8">
            <ul className="flex-1 space-y-3">
              {services.online.points.map((p) => (
                <li key={p} className="flex gap-3 text-mute">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {p}
                </li>
              ))}
            </ul>
            <a
              href={links.tallyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-5 font-semibold text-ink hover:bg-gold-bright"
            >
              Apply for Online Coaching
            </a>
          </div>
        </article>
      </section>

      {/* What to expect */}
      <section className="border-y border-line/60 bg-char">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="eyebrow mb-2">What to expect</div>
          <h2 className="font-display text-4xl uppercase leading-none">Coaching that keeps you on track</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {expectations.map((e) => (
              <div key={e.title} className="rounded-2xl bg-char-2 p-5">
                <h3 className="font-display text-xl uppercase text-gold">{e.title}</h3>
                <p className="mt-2 text-sm text-mute">{e.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wide photo */}
      {hasPhoto(photos.banner) && (
        <section className="mx-auto max-w-6xl px-4 pt-14">
          <GymPhoto photo={photos.banner} className="aspect-[4/5] sm:aspect-[3/2]" sizes="(min-width: 1152px) 1152px, 100vw" />
        </section>
      )}

      {/* Getting started */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="eyebrow mb-2">How to get started</div>
        <h2 className="font-display text-4xl uppercase leading-none">Three simple steps</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl border border-line/70 bg-char p-5">
              <div className="font-display text-4xl text-gold">{s.n}</div>
              <h3 className="mt-2 font-display text-2xl uppercase">{s.title}</h3>
              <p className="mt-2 text-mute">{s.body}</p>
            </li>
          ))}
        </ol>
        <CtaButtons links={links} className="mt-8" />
      </section>
    </>
  );
}
