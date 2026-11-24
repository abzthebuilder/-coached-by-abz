import { TERMS_UPDATED, healthDisclaimer, termsSections } from "@/content/terms";
import { LegalSections } from "@/components/legal-sections";

export const metadata = {
  title: "Terms and health disclaimer",
  description: "The terms for Coached by ABZ online coaching, and important health guidance.",
};

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="eyebrow mb-2">Terms</div>
      <h1 className="font-display text-5xl uppercase leading-none">Terms &amp; health disclaimer</h1>
      <p className="mt-4 text-lg text-mute">Please read these before you start coaching. They&apos;re written in plain English.</p>

      <section id="health" className="mt-10 rounded-2xl border border-gold/40 bg-gold/5 p-5">
        <h2 className="font-display text-3xl uppercase">Health disclaimer</h2>
        <div className="mt-6">
          <LegalSections sections={healthDisclaimer} />
        </div>
      </section>

      <h2 className="mt-14 font-display text-3xl uppercase">Terms of service</h2>
      <div className="mt-6">
        <LegalSections sections={termsSections} />
      </div>
      <p className="mt-12 border-t border-line/60 pt-6 text-sm text-faint">Last updated {TERMS_UPDATED}</p>
    </div>
  );
}
