import { describe, expect, it } from "vitest";
import { mapOffProduct, nutritionFor, isBarcode } from "@/lib/food-math";
import { BUILTIN_FOODS } from "@/content/foods";

describe("food diary maths", () => {
  it("scales per-100 values to the amount eaten", () => {
    expect(nutritionFor({ kcal: 350, proteinG: 30, carbsG: 35, fatG: 9 }, 120)).toEqual({ kcal: 420, proteinG: 36, carbsG: 42, fatG: 10.8 });
    expect(nutritionFor({ kcal: 89, proteinG: 1.1, carbsG: 20.2, fatG: 0.3 }, 120).kcal).toBe(107);
  });
  it("accepts only 8-14 digit barcodes", () => {
    expect(isBarcode("5000159461122")).toBe(true);
    expect(isBarcode("12345")).toBe(false);
    expect(isBarcode("5000159461122abc")).toBe(false);
  });
});

describe("Open Food Facts products", () => {
  const snickers = {
    code: "5000159461122",
    product_name: "Snickers",
    brands: "Mars Wrigley Confectionery UK Limited, Snickers",
    serving_quantity: 50,
    serving_size: "50 g",
    nutriments: { "energy-kcal_100g": 481, energy_100g: 2018, proteins_100g: 8.6, carbohydrates_100g: 60.5, fat_100g: 22.5 },
  };
  it("maps a real product", () => {
    expect(mapOffProduct(snickers)).toMatchObject({
      ref: "o:5000159461122",
      name: "Snickers",
      brand: "Mars Wrigley Confectionery UK Limited",
      kcal: 481,
      proteinG: 8.6,
      servingG: 50,
      unit: "g",
    });
  });
  it("works out kcal from kJ when kcal is missing", () => {
    const p = mapOffProduct({ ...snickers, nutriments: { energy_100g: 2018, proteins_100g: 8.6 } });
    expect(p?.kcal).toBeCloseTo(482.3, 0);
  });
  it("skips products without energy or a name", () => {
    expect(mapOffProduct({ ...snickers, nutriments: { proteins_100g: 8 } })).toBeNull();
    expect(mapOffProduct({ ...snickers, product_name: "" })).toBeNull();
  });
  it("tidies brands from the newer search", () => {
    expect(mapOffProduct({ ...snickers, brands: ["xx:fage", "xx:Fage"] })?.brand).toBe("Fage");
    expect(mapOffProduct({ ...snickers, brands: ["xx:FAGE Total"] })?.brand).toBe("FAGE Total");
  });
  it("spots drinks measured in ml", () => {
    expect(mapOffProduct({ ...snickers, quantity: "330 ml" })?.unit).toBe("ml");
  });
});

describe("built-in foods", () => {
  it("have consistent calories (except alcohol) and unique keys", () => {
    const keys = new Set<string>();
    for (const f of BUILTIN_FOODS) {
      expect(keys.has(f.key)).toBe(false);
      keys.add(f.key);
      if (["lager", "wine-red", "wine-white"].includes(f.key)) continue;
      const est = 4 * f.p + 4 * f.c + 9 * f.f;
      expect(est / f.kcal, f.key).toBeGreaterThan(0.8);
      expect(est / f.kcal, f.key).toBeLessThan(1.15);
    }
  });
});
