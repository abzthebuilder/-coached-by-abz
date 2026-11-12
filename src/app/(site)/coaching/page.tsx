import { CtaButtons, GymPhoto } from "@/components/site-chrome";
import { getSiteLinks } from "@/lib/settings";
import { audiences, expectations, faqs, photos, services } from "@/content/site";

export const metadata = { title: "Coaching" };

export default async function Coaching() {
  const links = await getSiteLinks();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="eyebrow mb-2">Coaching</div>
      <h1 className="font-display text-5xl uppercase leading-none">Online coaching &amp; 1:1 PT</h1>
      <p className="mt-4 max-w-2xl text-lg text-mute">
        Both options come with a plan built for you and a coach who keeps you accountable. Choose online coaching if you
        want to train on your own schedule, or 1:1 sessions if you want me with you on the gym floor.
      </p>

      {[
        { s: services.online, photo: photos.online, cta: { href: links.tallyUrl, label: "Apply for Online Coaching" } },
        { s: services.pt, photo: photos.pt, cta: { href: links.calendlyUrl, label: "Book a PT Consultation" } },
      ].map(({ s, photo, cta }, i) => (
        <section key={s.title} className="mt-12 grid gap-6 md:grid-cols-2 md:items-center">
          <GymPhoto photo={photo} className={i % 2 ? "aspect-[4/3] md:order-2" : "aspect-[4/3]"} />
          <div>
            <h2 className="font-display text-4xl uppercase">{s.title}</h2>
            <p className="mt-1 text-lg text-gold">{s.tagline}</p>
            <ul className="mt-5 space-y-3">
              {s.points.map((p) => (
                <li key={p} className="flex gap-3 text-mute">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {p}
                </li>
              ))}
            </ul>
            <a
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gold px-5 font-semibold text-ink hover:bg-gold-bright sm:w-auto"
            >
              {cta.label}
            </a>
          </div>
        </section>
      ))}

      <section className="mt-16">
        <h2 className="font-display text-3xl uppercase">Who it&apos;s for</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-2xl border border-line/70 bg-char p-5">
              <h3 className="font-display text-xl uppercase text-gold">{a.title}</h3>
              <p className="mt-2 text-sm text-mute">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl uppercase">What you can expect</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {expectations.map((e) => (
            <div key={e.title} className="rounded-2xl bg-char p-5">
              <h3 className="font-display text-xl uppercase text-gold">{e.title}</h3>
              <p className="mt-2 text-sm text-mute">{e.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl uppercase">Questions</h2>
        <div className="mt-5 divide-y divide-line/60 rounded-2xl border border-line/70 bg-char">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span aria-hidden className="text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-mute">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaButtons links={links} className="mt-12" />
    </div>
  );
}
