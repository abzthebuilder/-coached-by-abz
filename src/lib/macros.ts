export const KCAL = { protein: 4, carbs: 4, fat: 9 } as const;

export type MacroInput = { calories: number; proteinG: number; fatG: number };
export type MacroResult = {
  carbsG: number;
  proteinKcal: number;
  fatKcal: number;
  carbsKcal: number;
  pct: { protein: number; carbs: number; fat: number };
  errors: string[];
  warnings: string[];
};

/** Carbs fill whatever calories are left after protein and fat. */
export function calculateMacros({ calories, proteinG, fatG }: MacroInput): MacroResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!Number.isFinite(calories) || calories <= 0) errors.push("Enter a calorie target above 0.");
  if (!Number.isFinite(proteinG) || proteinG < 0) errors.push("Protein must be 0 g or more.");
  if (!Number.isFinite(fatG) || fatG < 0) errors.push("Fat must be 0 g or more.");

  const proteinKcal = Math.round(proteinG * KCAL.protein);
  const fatKcal = Math.round(fatG * KCAL.fat);
  const remaining = calories - proteinKcal - fatKcal;
  const carbsG = Math.max(0, Math.floor(remaining / KCAL.carbs));
  const carbsKcal = carbsG * KCAL.carbs;

  if (errors.length === 0 && remaining < 0) {
    errors.push(
      `Protein and fat already add up to ${proteinKcal + fatKcal} kcal, which is ${-remaining} kcal over the target.`,
    );
  }
  if (errors.length === 0 && carbsG < 50) warnings.push("Carbs are under 50 g. Check this is intended.");
  if (errors.length === 0 && calories < 1200) warnings.push("Calories are under 1,200 kcal.");

  const total = calories > 0 ? calories : 1;
  return {
    carbsG,
    proteinKcal,
    fatKcal,
    carbsKcal,
    pct: {
      protein: Math.round((proteinKcal / total) * 100),
      fat: Math.round((fatKcal / total) * 100),
      carbs: Math.round((carbsKcal / total) * 100),
    },
    errors,
    warnings,
  };
}
