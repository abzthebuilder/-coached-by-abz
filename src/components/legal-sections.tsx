import { PRIVACY_CONTACT } from "@/content/privacy";

type Section = { heading: string; paragraphs?: string[]; bullets?: string[] };

function withEmail(text: string) {
  if (!text.includes(PRIVACY_CONTACT)) return text;
  const [before, after] = text.split(PRIVACY_CONTACT);
  return (
    <>
      {before}
      <a href={`mailto:${PRIVACY_CONTACT}`} className="text-gold underline underline-offset-4">
        {PRIVACY_CONTACT}
      </a>
      {after}
    </>
  );
}

/** Renders a list of headed sections (paragraphs and bullet points) for legal pages. */
export function LegalSections({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-10">
      {sections.map((s) => (
        <section key={s.heading}>
          <h2 className="font-display text-2xl uppercase text-gold">{s.heading}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p} className="mt-3 text-mute">
              {withEmail(p)}
            </p>
          ))}
          {s.bullets && (
            <ul className="mt-3 space-y-2.5">
              {s.bullets.map((b) => (
                <li key={b} className="flex gap-3 text-mute">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span>{withEmail(b)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
