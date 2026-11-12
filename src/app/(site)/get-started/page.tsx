import { CtaButtons } from "@/components/site-chrome";
import { getSiteLinks } from "@/lib/settings";
import { steps } from "@/content/site";

export const metadata = { title: "Get started" };

export default async function GetStarted() {
  const links = await getSiteLinks();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="eyebrow mb-2">Get started</div>
      <h1 className="font-display text-5xl uppercase leading-none">Ready when you are</h1>
      <p className="mt-4 text-lg text-mute">
        Pick the option that suits you. Online coaching starts with a short application so I can understand your goals.
        Personal training starts with a consultation so we can meet, talk through what you want and plan your first
        sessions.
      </p>
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
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-char p-5">
          <h2 className="font-display text-2xl uppercase text-gold">Online Coaching</h2>
          <p className="mt-2 text-sm text-mute">Tell me about your goals, training history and schedule. I&apos;ll get back to you personally.</p>
        </div>
        <div className="rounded-2xl bg-char p-5">
          <h2 className="font-display text-2xl uppercase text-gold">PT Consultation</h2>
          <p className="mt-2 text-sm text-mute">Pick a time that suits you. We&apos;ll talk through your goals and how sessions would work.</p>
        </div>
      </div>
      <CtaButtons links={links} className="mt-8" />
      <p className="mt-6 text-sm text-faint">Already a client? Use Client Login to open your portal.</p>
    </div>
  );
}
