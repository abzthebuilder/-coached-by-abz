import Link from "next/link";
import { CtaButtons, GymPhoto } from "@/components/site-chrome";
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
          <GymPhoto photo={photos.about} className="aspect-[4/3]" />
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

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="eyebrow mb-2">How I can help</div>
        <h2 className="font-display text-4xl uppercase leading-none">Two ways to work with me</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { s: services.online, href: links.tallyUrl, cta: "Apply for Online Coaching", photo: photos.online },
            { s: services.pt, href: links.calendlyUrl, cta: "Book a PT Consultation", photo: photos.pt },
          ].map(({ s, href, cta, photo }) => (
            <article key={s.title} className="flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-char">
              <GymPhoto photo={photo} className="aspect-[16/9] rounded-none" />
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-3xl uppercase">{s.title}</h3>
                <p className="mt-1 text-gold">{s.tagline}</p>
                <ul className="mt-4 flex-1 space-y-2.5">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-3 text-mute">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {p}
                    </li>
                  ))}
                </ul>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-5 font-semibold text-ink hover:bg-gold-bright"
                >
                  {cta}
                </a>
              </div>
            </article>
          ))}
        </div>
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

      {/* Photo strip */}
      <section className="mx-auto grid max-w-6xl grid-cols-3 gap-2 px-4 pt-14">
        <GymPhoto photo={photos.strip1} className="aspect-square" sizes="33vw" />
        <GymPhoto photo={photos.strip2} className="aspect-square" sizes="33vw" />
        <GymPhoto photo={photos.strip3} className="aspect-square" sizes="33vw" />
      </section>

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
