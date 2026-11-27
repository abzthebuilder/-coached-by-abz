import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { addDays, fmtDay, isDay, todayIn } from "@/lib/dates";
import { recentFoods } from "@/lib/food";
import { isMeal, mealLabel, type MealKey } from "@/lib/food-math";
import { FoodPicker } from "@/components/food/food-picker";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Add food" };

export default async function AddFood({ searchParams }: { searchParams: Promise<{ day?: string; meal?: string }> }) {
  const { user, profile } = await requireClient();
  const sp = await searchParams;
  const today = todayIn(user.timezone);
  const day = isDay(sp.day) && sp.day <= today && sp.day >= addDays(today, -365) ? sp.day : today;
  const meal: MealKey = isMeal(sp.meal) ? sp.meal : "SNACKS";
  const recent = await recentFoods(profile.id);
  return (
    <div>
      <Link href={`/app/nutrition?day=${day}`} className="text-sm text-mute">
        ← Food diary
      </Link>
      <PageHeader eyebrow={day === today ? "Today" : fmtDay(day, { weekday: true })} title={`Add to ${mealLabel(meal)}`} />
      <FoodPicker day={day} meal={meal} mealName={mealLabel(meal).toLowerCase()} recent={recent} />
    </div>
  );
}
