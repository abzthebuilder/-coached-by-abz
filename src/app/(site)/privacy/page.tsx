import { PRIVACY_CONTACT, PRIVACY_UPDATED, privacySections } from "@/content/privacy";

export const metadata = { title: "Privacy policy", description: "How Coached by ABZ collects, uses and protects your information." };

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="eyebrow mb-2">Privacy</div>
      <h1 className="font-display text-5xl uppercase leading-none">Privacy policy</h1>
      <p className="mt-4 text-lg text-mute">
        How Coached by ABZ collects, uses and protects your information, in plain English.
      </p>
      <div className="mt-10 space-y-10">
        {privacySections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-2xl uppercase text-gold">{s.heading}</h2>
            {s.paragraphs?.map((p) => (
              <p key={p} className="mt-3 text-mute">
                {p.includes(PRIVACY_CONTACT) ? (
                  <>
                    {p.split(PRIVACY_CONTACT)[0]}
                    <a href={`mailto:${PRIVACY_CONTACT}`} className="text-gold underline underline-offset-4">
                      {PRIVACY_CONTACT}
                    </a>
                    {p.split(PRIVACY_CONTACT)[1]}
                  </>
                ) : (
                  p
                )}
              </p>
            ))}
            {s.bullets && (
              <ul className="mt-3 space-y-2.5">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-mute">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="mt-12 border-t border-line/60 pt-6 text-sm text-faint">Last updated {PRIVACY_UPDATED}</p>
    </div>
  );
}
