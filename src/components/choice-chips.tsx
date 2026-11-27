import { cx } from "./ui";

/** A set of big tappable radio options. Works without JavaScript. */
export function ChoiceChips({
  name,
  legend,
  options,
  cols = 2,
  required = true,
  hint,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  cols?: 2 | 3 | 4 | 7;
  required?: boolean;
  hint?: string;
}) {
  const grid = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4", 7: "grid-cols-7" }[cols];
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      {hint && <p className="-mt-1 mb-2 text-xs text-faint">{hint}</p>}
      <div className={cx("grid gap-2", grid)}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-line bg-ink px-2 text-center text-sm font-semibold",
              "has-checked:border-gold has-checked:bg-gold has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-gold",
            )}
          >
            <input type="radio" name={name} value={o.value} required={required} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
