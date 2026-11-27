"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addFoodEntryAction, createCustomFoodAction, quickAddAction } from "@/app/actions/client";
import { FormMessage, PendingProvider, SubmitButton, useKeepAction } from "@/components/form";
import { Field, cx } from "@/components/ui";
import { type FoodHit, type MealKey, nutritionFor } from "@/lib/food-math";

// The camera scanner (and its barcode reader) only loads when someone opens the Scan tab.
const BarcodeScanner = dynamic(() => import("./barcode-scanner").then((m) => m.BarcodeScanner), {
  ssr: false,
  loading: () => <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-black text-sm text-mute">Starting camera…</div>,
});

type Tab = "search" | "scan" | "create" | "quick";
const n0 = (v: number) => Math.round(v).toLocaleString("en-GB");
const n1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString("en-GB");
/** "1 bar (60 g)" stays as it is; "1 slice" becomes "1 slice = 38 g". */
const servingText = (h: FoodHit) =>
  h.servingLabel && /\d\s*(g|gr|grams?|ml|millilitres?)\b/i.test(h.servingLabel) ? h.servingLabel : `${h.servingLabel || "1 serving"} = ${n1(h.servingG ?? 0)} ${h.unit}`;

export function FoodPicker({ day, meal, mealName, recent }: { day: string; meal: MealKey; mealName: string; recent: FoodHit[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("search");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<FoodHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<FoodHit | null>(null);
  const [barcode, setBarcode] = useState("");
  const back = `/app/nutrition?day=${day}`;
  const done = useCallback(() => {
    router.push(`${back}&added=1`);
    router.refresh();
  }, [router, back]);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return setHits(null);
    setLoading(true);
    setNote("");
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as { hits: FoodHit[]; offStatus: string };
      setHits(data.hits);
      if (data.offStatus === "busy")
        setNote("The product database is busy, so only common foods and your own foods are shown. Try again in a minute, or scan the barcode.");
    } catch {
      setNote("Search didn't work. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const lookUp = useCallback(async (code: string) => {
    setNote(`Looking up ${code}…`);
    try {
      const res = await fetch(`/api/food/barcode/${code}`);
      const data = (await res.json()) as { status: string; hit?: FoodHit };
      if (data.hit) {
        setNote("");
        setPicked(data.hit);
      } else if (data.status === "not_found" || data.status === "invalid") {
        setBarcode(code);
        setTab("create");
        setNote("That barcode isn't in the database yet. Add it from the label below. You'll only need to do this once.");
      } else {
        setNote("Couldn't look that up right now. Try again in a minute, or add it from the label.");
      }
    } catch {
      setNote("Couldn't look that up. Check your connection and try again.");
    }
  }, []);

  // Search results are only for choosing: a product's nutrition always comes from its own record.
  async function choose(h: FoodHit) {
    if (h.source !== "off") return setPicked(h);
    setNote("Loading product details…");
    try {
      const res = await fetch(`/api/food/barcode/${h.ref.slice(2)}`);
      const data = (await res.json()) as { hit?: FoodHit };
      setNote("");
      setPicked(data.hit ?? h);
    } catch {
      setNote("");
      setPicked(h);
    }
  }

  if (picked) return <AmountPanel food={picked} day={day} meal={meal} mealName={mealName} onBack={() => setPicked(null)} onDone={done} />;

  const list = hits ?? recent;
  const tabs: [Tab, string][] = [
    ["search", "Search"],
    ["scan", "Scan"],
    ["create", "Create"],
    ["quick", "Quick add"],
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Ways to add food" className="grid grid-cols-4 gap-1 rounded-xl bg-char-2 p-1">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setNote("");
            }}
            className={cx("min-h-11 rounded-lg text-sm font-semibold", tab === t ? "bg-gold text-ink" : "text-mute")}
          >
            {label}
          </button>
        ))}
      </div>

      {note && (
        <p role="status" className="rounded-xl bg-gold/10 p-3 text-sm text-gold">
          {note}
        </p>
      )}

      {tab === "search" && (
        <div className="space-y-3">
          <form onSubmit={search} className="flex gap-2" role="search">
            <input
              className="field"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="e.g. chicken breast, Fage, oats"
              aria-label="Search foods"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (!e.target.value) setHits(null);
              }}
            />
            <button className="min-h-12 shrink-0 rounded-xl bg-gold px-4 font-semibold text-ink" disabled={loading}>
              {loading ? "…" : "Search"}
            </button>
          </form>
          <div className="text-xs uppercase tracking-wide text-faint">{hits ? `${hits.length} results` : "Recent foods"}</div>
          {list.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-mute">
              {hits ? "Nothing found. Try fewer words, scan the barcode, or create it from the label." : "Foods you log will appear here for quick re-adding."}
            </p>
          ) : (
            <ul className="divide-y divide-line/60 rounded-xl border border-line/70">
              {list.map((h) => (
                <li key={h.ref}>
                  <button onClick={() => choose(h)} className="flex min-h-16 w-full items-center justify-between gap-3 px-3 py-2 text-left">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{h.name}</span>
                      <span className="block truncate text-xs text-mute">
                        {[h.brand, h.source === "builtin" ? "Common food" : h.source === "custom" ? "My food" : null].filter(Boolean).join(" · ")}
                        {h.servingG ? ` · ${servingText(h)}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display tabular text-lg leading-none">{n0(h.kcal)}</span>
                      <span className="text-[11px] text-faint">kcal / 100 {h.unit}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {list.some((h) => h.source === "off") && (
            <p className="text-[11px] text-faint">
              Product data from{" "}
              <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline">
                Open Food Facts
              </a>
              , available under the Open Database Licence. Always check against the pack.
            </p>
          )}
        </div>
      )}

      {tab === "scan" && (
        <div className="space-y-4">
          <BarcodeScanner onCode={lookUp} />
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const code = barcode.replace(/\s/g, "");
              if (/^\d{8,14}$/.test(code)) lookUp(code);
              else setNote("A barcode is the 8 to 14 digit number under the lines.");
            }}
          >
            <input
              className="field tabular"
              inputMode="numeric"
              placeholder="Or type the barcode number"
              aria-label="Barcode number"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/[^\d]/g, ""))}
            />
            <button className="min-h-12 shrink-0 rounded-xl border border-line px-4 font-semibold">Look up</button>
          </form>
        </div>
      )}

      {tab === "create" && <CreateFood barcode={barcode} onCreated={setPicked} />}
      {tab === "quick" && <QuickAdd day={day} meal={meal} mealName={mealName} onDone={done} />}
    </div>
  );
}

function AmountPanel({
  food,
  day,
  meal,
  mealName,
  onBack,
  onDone,
}: {
  food: FoodHit;
  day: string;
  meal: MealKey;
  mealName: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"serving" | "unit">(food.servingG ? "serving" : "unit");
  const [qty, setQty] = useState(food.servingG ? "1" : "100");
  const { state, onSubmit, pending } = useKeepAction(addFoodEntryAction);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const q = Number(qty.replace(",", "."));
  const amount = Number.isFinite(q) && q > 0 ? (mode === "serving" && food.servingG ? q * food.servingG : q) : 0;
  const n = nutritionFor(food, amount);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PendingProvider pending={pending}>
        <button type="button" onClick={onBack} className="min-h-11 text-sm text-mute">
          ← Back to results
        </button>
        <div>
          <h2 className="font-display text-2xl uppercase leading-tight">{food.name}</h2>
          {food.brand && <p className="text-sm text-mute">{food.brand}</p>}
          <p className="mt-1 text-xs text-faint">
            Per 100 {food.unit}: {n0(food.kcal)} kcal · P {n1(food.proteinG)}g · C {n1(food.carbsG)}g · F {n1(food.fatG)}g
          </p>
        </div>
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="meal" value={meal} />
        <input type="hidden" name="ref" value={food.ref} />
        <input type="hidden" name="amount" value={amount ? String(Math.round(amount * 10) / 10) : ""} />

        {food.servingG && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-char-2 p-1" role="group" aria-label="Measure by">
            {(["serving", "unit"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setQty(m === "serving" ? "1" : String(food.servingG));
                }}
                className={cx("min-h-11 rounded-lg text-sm font-semibold", mode === m ? "bg-gold text-ink" : "text-mute")}
              >
                {m === "serving" ? food.servingLabel || "Servings" : food.unit === "ml" ? "Millilitres" : "Grams"}
              </button>
            ))}
          </div>
        )}
        <Field label={mode === "serving" ? `How many? (${servingText(food)})` : `Amount (${food.unit})`}>
          <input
            className="field font-display text-3xl tabular"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^\d.,]/g, ""))}
            aria-label={mode === "serving" ? "Number of servings" : `Amount in ${food.unit}`}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-4 gap-2 text-center" aria-live="polite">
          {[
            ["Kcal", n0(n.kcal)],
            ["Protein", `${n1(n.proteinG)}g`],
            ["Carbs", `${n1(n.carbsG)}g`],
            ["Fat", `${n1(n.fatG)}g`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-char-2 p-2">
              <div className="text-[11px] text-mute">{l}</div>
              <div className="font-display tabular text-xl">{v}</div>
            </div>
          ))}
        </div>
        <FormMessage state={state} />
        <SubmitButton className="w-full" pendingText="Adding…">
          Add to {mealName}
        </SubmitButton>
      </PendingProvider>
    </form>
  );
}

function CreateFood({ barcode, onCreated }: { barcode: string; onCreated: (h: FoodHit) => void }) {
  const [v, setV] = useState({ name: "", brand: "", unit: "g", kcal: "", proteinG: "", carbsG: "", fatG: "", servingG: "", servingLabel: "", barcode });
  const { state, onSubmit, pending } = useKeepAction(createCustomFoodAction);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  useEffect(() => setV((x) => ({ ...x, barcode })), [barcode]);
  useEffect(() => {
    if (state?.ok && state.ref) {
      const num = (s: string) => Number(s.replace(",", ".")) || 0;
      onCreated({
        ref: state.ref,
        name: v.name,
        brand: v.brand,
        unit: v.unit === "ml" ? "ml" : "g",
        kcal: num(v.kcal),
        proteinG: num(v.proteinG),
        carbsG: num(v.carbsG),
        fatG: num(v.fatG),
        servingG: num(v.servingG) || null,
        servingLabel: v.servingLabel || (num(v.servingG) ? "1 serving" : ""),
        source: "custom",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const per = v.unit === "ml" ? "100 ml" : "100 g";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <PendingProvider pending={pending}>
        <p className="text-sm text-mute">Copy the numbers from the nutrition label. Use the &ldquo;per {per}&rdquo; column.</p>
        <Field label="Food name">
          <input className="field" name="name" value={v.name} onChange={set("name")} required />
        </Field>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Brand (optional)">
            <input className="field" name="brand" value={v.brand} onChange={set("brand")} />
          </Field>
          <Field label="Measured in">
            <select className="field" name="unit" value={v.unit} onChange={set("unit")}>
              <option value="g">grams</option>
              <option value="ml">ml</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["kcal", `Calories per ${per}`],
              ["proteinG", `Protein (g) per ${per}`],
              ["carbsG", `Carbs (g) per ${per}`],
              ["fatG", `Fat (g) per ${per}`],
            ] as const
          ).map(([k, l]) => (
            <Field key={k} label={l}>
              <input className="field tabular" name={k} inputMode="decimal" value={v[k]} onChange={set(k)} required />
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Serving size (${v.unit}, optional)`}>
            <input className="field tabular" name="servingG" inputMode="decimal" value={v.servingG} onChange={set("servingG")} />
          </Field>
          <Field label="Serving name (optional)">
            <input className="field" name="servingLabel" placeholder="e.g. 1 bar" value={v.servingLabel} onChange={set("servingLabel")} />
          </Field>
        </div>
        <Field label="Barcode (optional)">
          <input className="field tabular" name="barcode" inputMode="numeric" value={v.barcode} onChange={set("barcode")} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton className="w-full" pendingText="Saving…">
          Save food
        </SubmitButton>
      </PendingProvider>
    </form>
  );
}

function QuickAdd({ day, meal, mealName, onDone }: { day: string; meal: MealKey; mealName: string; onDone: () => void }) {
  const { state, onSubmit, pending } = useKeepAction(quickAddAction);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <PendingProvider pending={pending}>
        <p className="text-sm text-mute">For a meal out or anything where you only know the calories.</p>
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="meal" value={meal} />
        <Field label="What was it? (optional)">
          <input className="field" name="name" placeholder="e.g. Nando's chicken wrap" />
        </Field>
        <Field label="Calories">
          <input className="field font-display text-3xl tabular" name="kcal" inputMode="numeric" required />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Protein (g)">
            <input className="field tabular" name="proteinG" inputMode="decimal" />
          </Field>
          <Field label="Carbs (g)">
            <input className="field tabular" name="carbsG" inputMode="decimal" />
          </Field>
          <Field label="Fat (g)">
            <input className="field tabular" name="fatG" inputMode="decimal" />
          </Field>
        </div>
        <FormMessage state={state} />
        <SubmitButton className="w-full" pendingText="Adding…">
          Add to {mealName}
        </SubmitButton>
      </PendingProvider>
    </form>
  );
}
