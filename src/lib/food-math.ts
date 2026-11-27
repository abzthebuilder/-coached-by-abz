// Pure helpers for the food diary (shared by server, browser and unit tests).

export type Per100 = { kcal: number; proteinG: number; carbsG: number; fatG: number };
export type FoodHit = Per100 & {
  ref: string; // "b:<key>" built-in, "d:<id>" saved food, "o:<barcode>" Open Food Facts
  name: string;
  brand: string;
  unit: "g" | "ml";
  servingG: number | null;
  servingLabel: string;
  source: "builtin" | "off" | "custom";
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Nutrition for `amount` grams (or ml) of a food with values per 100. */
export function nutritionFor(food: Per100, amount: number): Per100 {
  const k = amount / 100;
  return { kcal: Math.round(food.kcal * k), proteinG: r1(food.proteinG * k), carbsG: r1(food.carbsG * k), fatG: r1(food.fatG * k) };
}

export const MEALS = [
  { key: "BREAKFAST", label: "Breakfast" },
  { key: "LUNCH", label: "Lunch" },
  { key: "DINNER", label: "Dinner" },
  { key: "SNACKS", label: "Snacks" },
] as const;
export type MealKey = (typeof MEALS)[number]["key"];
export const isMeal = (v: unknown): v is MealKey => MEALS.some((m) => m.key === v);
export const mealLabel = (k: MealKey) => MEALS.find((m) => m.key === k)!.label;

export const isBarcode = (v: string) => /^\d{8,14}$/.test(v);

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string | string[];
  quantity?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
};

const numOr = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/** First brand, without the "xx:" language prefix the newer search adds. */
function cleanBrand(b: string | string[] | undefined): string {
  const first = (Array.isArray(b) ? b[0] : (b ?? "").split(",")[0]) ?? "";
  const t = first.replace(/^[a-z]{2}:/, "").replace(/-/g, " ").trim();
  return (t && t === t.toLowerCase() ? t.replace(/\b\w/g, (c) => c.toUpperCase()) : t).slice(0, 80);
}

/** Turns an Open Food Facts product into a food we can log, or null if it lacks calories or a name. */
export function mapOffProduct(p: OffProduct): FoodHit | null {
  const n = p.nutriments ?? {};
  const name = (p.product_name || p.product_name_en || "").trim();
  const code = String(p.code ?? "").trim();
  let kcal = numOr(n["energy-kcal_100g"]);
  if (kcal === null) {
    const kj = numOr(n["energy-kj_100g"]) ?? numOr(n["energy_100g"]);
    if (kj !== null) kcal = kj / 4.184;
  }
  if (!name || !isBarcode(code) || kcal === null || kcal < 0 || kcal > 950) return null;
  const clamp = (v: number | null) => (v === null || v < 0 ? 0 : Math.min(v, 100));
  const serving = numOr(p.serving_quantity);
  const unit: "g" | "ml" = /\d\s*(ml|cl|l)\b/i.test(p.quantity ?? "") ? "ml" : "g";
  return {
    ref: `o:${code}`,
    name: name.slice(0, 120),
    brand: cleanBrand(p.brands),
    unit,
    kcal: Math.round(kcal * 10) / 10,
    proteinG: clamp(numOr(n["proteins_100g"])),
    carbsG: clamp(numOr(n["carbohydrates_100g"])),
    fatG: clamp(numOr(n["fat_100g"])),
    servingG: serving !== null && serving > 0 && serving <= 2000 ? serving : null,
    servingLabel: (p.serving_size ?? "").trim().slice(0, 40),
    source: "off",
  };
}
