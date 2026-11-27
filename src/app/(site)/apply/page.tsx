import Link from "next/link";
import { ApplyForm } from "@/components/apply-form";
import { ChoiceChips } from "@/components/choice-chips";
import { Card, Field } from "@/components/ui";
import { EXPERIENCE, GOALS, HEARD_FROM, TRAINS_AT } from "@/content/apply";

export const metadata = {
  title: "Apply for online coaching",
  description: "Apply for online coaching with ABZ. Tell me about your goals and I'll get back to you personally.",
};

const opts = (list: readonly { key: string; label: string }[]) => list.map((x) => ({ value: x.key, label: x.label }));

export default async function Apply({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  if (sent)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="eyebrow mb-2">Application sent</div>
        <h1 className="font-display text-5xl uppercase leading-none">Thanks for applying</h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-mute">
          I&apos;ll read your application and get back to you personally by email{" "}
          <span className="whitespace-nowrap">(or phone, if you gave your number)</span>.
        </p>
        <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-xl border border-line px-5 font-semibold">
          Back to the home page
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="eyebrow mb-2">Online coaching</div>
      <h1 className="font-display text-5xl uppercase leading-none">Apply</h1>
      <p className="mt-4 text-lg text-mute">
        Tell me about you and your goals. It takes a few minutes, and I read every application personally.
      </p>

      <div className="mt-8">
        <ApplyForm>
          {/* Hidden from people; spam bots fill it in. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
            <label>
              Company
              <input name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <Card className="space-y-4">
            <h2 className="font-display text-2xl uppercase">About you</h2>
            <Field label="Your name">
              <input className="field" name="name" autoComplete="name" required maxLength={120} />
            </Field>
            <Field label="Email">
              <input className="field" name="email" type="email" autoComplete="email" required maxLength={200} />
            </Field>
            <Field label="Phone or WhatsApp (optional)" hint="Only if you'd like a quick chat.">
              <input className="field" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} />
            </Field>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-2xl uppercase">Your goals</h2>
            <ChoiceChips name="goal" legend="What's your main goal?" options={opts(GOALS)} />
            <Field label="Tell me about your goals" hint="What do you want to change, and why now?">
              <textarea className="field min-h-28" name="about" required minLength={10} maxLength={3000} />
            </Field>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-2xl uppercase">Training</h2>
            <ChoiceChips name="experience" legend="Your training experience" options={opts(EXPERIENCE)} cols={3} />
            <ChoiceChips
              name="daysPerWeek"
              legend="How many days a week can you train?"
              options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))}
              cols={7}
            />
            <ChoiceChips name="trainsAt" legend="Where will you train?" options={opts(TRAINS_AT)} cols={3} />
            <Field label="Any injuries, or anything else I should know? (optional)">
              <textarea className="field min-h-20" name="injuries" maxLength={3000} />
            </Field>
          </Card>

          <Card className="space-y-4">
            <Field label="How did you hear about me? (optional)">
              <select className="field" name="heardFrom" defaultValue="">
                <option value="">Choose…</option>
                {HEARD_FROM.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex gap-3 rounded-xl border border-line bg-char-2 p-4 text-sm text-mute">
              <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#d4af37]" />
              <span>
                I&apos;m 18 or over, my answers are true to the best of my knowledge, and I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener" className="text-gold underline underline-offset-4">
                  terms and health disclaimer
                </a>
                .
              </span>
            </label>
            <label className="flex gap-3 rounded-xl border border-line bg-char-2 p-4 text-sm text-mute">
              <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#d4af37]" />
              <span>
                I agree to Coached by ABZ using my answers, including anything I&apos;ve shared about injuries, to review my application, as
                explained in the{" "}
                <a href="/privacy" target="_blank" rel="noopener" className="text-gold underline underline-offset-4">
                  privacy policy
                </a>
                .
              </span>
            </label>
          </Card>
        </ApplyForm>
      </div>
    </div>
  );
}
