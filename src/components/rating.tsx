import { cx } from "./ui";

/** 1–5 rating as big tappable radio chips. Works without JavaScript. */
export function Rating({ name, label, low, high, required = true }: { name: string; label: string; low: string; high: string; required?: boolean }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={cx(
              "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-line bg-ink font-display text-xl",
              "has-checked:border-gold has-checked:bg-gold has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-gold",
            )}
          >
            <input type="radio" name={name} value={n} required={required} className="sr-only" />
            {n}
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-faint">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}
