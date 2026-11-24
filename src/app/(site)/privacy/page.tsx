import { PRIVACY_UPDATED, privacySections } from "@/content/privacy";
import { LegalSections } from "@/components/legal-sections";

export const metadata = { title: "Privacy policy", description: "How Coached by ABZ collects, uses and protects your information." };

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="eyebrow mb-2">Privacy</div>
      <h1 className="font-display text-5xl uppercase leading-none">Privacy policy</h1>
      <p className="mt-4 text-lg text-mute">How Coached by ABZ collects, uses and protects your information, in plain English.</p>
      <div className="mt-10">
        <LegalSections sections={privacySections} />
      </div>
      <p className="mt-12 border-t border-line/60 pt-6 text-sm text-faint">Last updated {PRIVACY_UPDATED}</p>
    </div>
  );
}
