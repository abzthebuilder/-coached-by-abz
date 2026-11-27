import "server-only";
import { db } from "./db";
import { BUILTIN_BY_KEY, BUILTIN_FOODS, type BuiltinFood } from "@/content/foods";
import { type FoodHit, isBarcode, mapOffProduct, nutritionFor } from "./food-math";
import type { Food } from "@prisma/client";

// ---------- Open Food Facts (free food database, ODbL licence) ----------
// Only the search words or barcode are sent. Never anything about the client.

const OFF_BASE = (process.env.OFF_BASE_URL || "https://world.openfoodfacts.org").replace(/\/$/, "");
// Open Food Facts' newer search service: more reliable, but patchier data, so it's the fallback.
const OFF_SEARCH = (process.env.OFF_SEARCH_URL || "https://search.openfoodfacts.org").replace(/\/$/, "");
const UA = process.env.OFF_USER_AGENT || "CoachedByABZ/1.0 (+https://coachedbyabz.com)";
const FIELDS = "code,product_name,product_name_en,brands,quantity,serving_quantity,serving_size,nutriments";

// Open Food Facts allows about 10 searches a minute per server. Stay under it and remember results.
const searchTimes: number[] = [];
const searchCache = new Map<string, { at: number; hits: FoodHit[] }>();
const SEARCH_TTL = 6 * 3600_000;

async function offGet(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      if (res.status === 503 || res.status === 429 || res.status === 502) {
        await new Promise((r) => setTimeout(r, 700));
        continue;
      }
      return res;
    } catch {
      /* timeout or network: try once more */
    }
  }
  return null;
}

export type OffSearch = { hits: FoodHit[]; status: "ok" | "busy" | "skipped" };

export async function searchOff(query: string): Promise<OffSearch> {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return { hits: [], status: "skipped" };
  const cached = searchCache.get(q);
  if (cached && Date.now() - cached.at < SEARCH_TTL) return { hits: cached.hits, status: "ok" };
  const now = Date.now();
  while (searchTimes.length && now - searchTimes[0] > 60_000) searchTimes.shift();
  if (searchTimes.length >= 8) return { hits: [], status: "busy" };
  searchTimes.push(now);
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    sort_by: "unique_scans_n",
    fields: FIELDS,
    tagtype_0: "countries",
    tag_contains_0: "contains",
    tag_0: "united-kingdom",
  });
  const toHits = (list: unknown[] | undefined) => {
    const seen = new Set<string>();
    return (list ?? [])
      .map((p) => mapOffProduct(p as Parameters<typeof mapOffProduct>[0]))
      .filter((h): h is FoodHit => !!h && !seen.has(h.ref) && !!seen.add(h.ref));
  };
  let hits: FoodHit[] | null = null;
  // 1. The classic search: best UK results, but often too busy to answer.
  const res = await offGet(`${OFF_BASE}/cgi/search.pl?${params}`);
  if (res?.ok) {
    try {
      hits = toHits(((await res.json()) as { products?: unknown[] }).products);
    } catch {
      hits = null;
    }
  }
  // 2. Fallback: the newer search, keeping only products that have calories.
  if (hits === null) {
    const sp = new URLSearchParams({ q: `${q} nutriments.energy-kcal_100g:>0`, page_size: "20", sort_by: "-unique_scans_n", fields: FIELDS });
    const res2 = await offGet(`${OFF_SEARCH}/search?${sp}`);
    if (res2?.ok) {
      try {
        hits = toHits(((await res2.json()) as { hits?: unknown[] }).hits);
      } catch {
        hits = null;
      }
    }
  }
  if (hits === null) return { hits: [], status: "busy" };
  searchCache.set(q, { at: Date.now(), hits });
  if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value!);
  return { hits, status: "ok" };
}

/** Looks a barcode up (our saved copy first, then Open Food Facts) and saves it for next time. */
export async function foodByBarcode(code: string): Promise<{ food: Food | null; status: "ok" | "not_found" | "busy" }> {
  if (!isBarcode(code)) return { food: null, status: "not_found" };
  const saved = await db.food.findFirst({ where: { source: "OFF", barcode: code } });
  if (saved) return { food: saved, status: "ok" };
  const res = await offGet(`${OFF_BASE}/api/v2/product/${code}?fields=${FIELDS}`);
  if (!res) return { food: null, status: "busy" };
  if (res.status === 404) return { food: null, status: "not_found" };
  if (!res.ok) return { food: null, status: "busy" };
  try {
    const data = (await res.json()) as { status?: number; product?: Parameters<typeof mapOffProduct>[0] };
    const hit = data.status === 1 && data.product ? mapOffProduct({ ...data.product, code }) : null;
    if (!hit) return { food: null, status: "not_found" };
    const food = await db.food.create({
      data: {
        source: "OFF",
        barcode: code,
        name: hit.name,
        brand: hit.brand,
        unit: hit.unit,
        kcal: hit.kcal,
        proteinG: hit.proteinG,
        carbsG: hit.carbsG,
        fatG: hit.fatG,
        servingG: hit.servingG,
        servingLabel: hit.servingLabel,
      },
    });
    return { food, status: "ok" };
  } catch {
    return { food: null, status: "busy" };
  }
}

// ---------- Built-in foods and saved foods ----------

function builtinHit(b: BuiltinFood): FoodHit {
  return {
    ref: `b:${b.key}`,
    name: b.name,
    brand: "",
    unit: b.unit ?? "g",
    kcal: b.kcal,
    proteinG: b.p,
    carbsG: b.c,
    fatG: b.f,
    servingG: b.serving?.g ?? null,
    servingLabel: b.serving?.label ?? "",
    source: "builtin",
  };
}

export function foodHit(f: Food): FoodHit {
  return {
    ref: `d:${f.id}`,
    name: f.name,
    brand: f.brand,
    unit: f.unit === "ml" ? "ml" : "g",
    kcal: f.kcal,
    proteinG: f.proteinG,
    carbsG: f.carbsG,
    fatG: f.fatG,
    servingG: f.servingG,
    servingLabel: f.servingLabel,
    source: f.source === "CUSTOM" ? "custom" : f.source === "OFF" ? "off" : "builtin",
  };
}

export function searchBuiltin(query: string, limit = 8): FoodHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return BUILTIN_FOODS.map((b) => {
    const hay = [b.name, ...(b.aliases ?? [])].join(" ").toLowerCase();
    if (!words.every((w) => hay.includes(w))) return null;
    const score = b.name.toLowerCase().startsWith(words[0]) ? 0 : b.name.toLowerCase().includes(words[0]) ? 1 : 2;
    return { b, score };
  })
    .filter((x): x is { b: BuiltinFood; score: number } => !!x)
    .sort((x, y) => x.score - y.score || x.b.name.localeCompare(y.b.name))
    .slice(0, limit)
    .map((x) => builtinHit(x.b));
}

export async function searchFoods(clientId: string, query: string) {
  const q = query.trim().slice(0, 80);
  const [mine, off] = await Promise.all([
    db.food.findMany({
      where: { ownerClientId: clientId, source: "CUSTOM", name: { contains: q, mode: "insensitive" } },
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
    searchOff(q),
  ]);
  return { hits: [...mine.map(foodHit), ...searchBuiltin(q), ...off.hits], offStatus: off.status };
}

/** The client's most recently logged foods, newest first, without repeats. */
export async function recentFoods(clientId: string, limit = 15): Promise<FoodHit[]> {
  const entries = await db.foodEntry.findMany({
    where: { clientId, foodId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { food: true },
  });
  const out: FoodHit[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (!e.food || seen.has(e.food.id)) continue;
    if (e.food.source === "CUSTOM" && e.food.ownerClientId !== clientId) continue;
    seen.add(e.food.id);
    out.push(foodHit(e.food));
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Resolves a food reference from the browser to a stored food this client may use.
 * Nutrition always comes from here, never from numbers the browser sends.
 */
export async function resolveFood(ref: string, clientId: string): Promise<Food | null> {
  const [kind, id] = [ref.slice(0, 2), ref.slice(2)];
  if (kind === "b:") {
    const b = BUILTIN_BY_KEY.get(id);
    if (!b) return null;
    const data = {
      source: "BUILTIN" as const,
      name: b.name,
      unit: b.unit ?? "g",
      kcal: b.kcal,
      proteinG: b.p,
      carbsG: b.c,
      fatG: b.f,
      servingG: b.serving?.g ?? null,
      servingLabel: b.serving?.label ?? "",
    };
    return db.food.upsert({ where: { id: `builtin-${b.key}` }, create: { id: `builtin-${b.key}`, ...data }, update: data });
  }
  if (kind === "d:") {
    const f = await db.food.findUnique({ where: { id } });
    if (!f) return null;
    if (f.source === "CUSTOM" && f.ownerClientId !== clientId) return null;
    return f;
  }
  if (kind === "o:") return (await foodByBarcode(id)).food;
  return null;
}

export function entryNutrition(food: Food, amount: number) {
  return nutritionFor(food, amount);
}

/** Keeps the day's calories and macros equal to the food diary's totals (or clears them if the diary is empty). */
export async function recomputeDiaryTotals(clientId: string, day: string) {
  const agg = await db.foodEntry.aggregate({
    where: { clientId, day },
    _sum: { kcal: true, proteinG: true, carbsG: true, fatG: true },
    _count: true,
  });
  if (agg._count === 0) {
    await db.dailyLog.updateMany({
      where: { clientId, day, fromDiary: true },
      data: { calories: null, proteinG: null, carbsG: null, fatG: null, fromDiary: false },
    });
    return;
  }
  const data = {
    calories: Math.round(agg._sum.kcal ?? 0),
    proteinG: Math.round(agg._sum.proteinG ?? 0),
    carbsG: Math.round(agg._sum.carbsG ?? 0),
    fatG: Math.round(agg._sum.fatG ?? 0),
    fromDiary: true,
  };
  await db.dailyLog.upsert({ where: { clientId_day: { clientId, day } }, create: { clientId, day, ...data }, update: data });
}
