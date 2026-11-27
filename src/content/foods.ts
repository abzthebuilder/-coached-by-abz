// Common foods with typical values per 100 g (or 100 ml for drinks).
// Carbohydrate is "available carbohydrate" (fibre not included), the way UK food labels show it.
// These are averages: for branded products, clients should scan the barcode instead.

export type BuiltinFood = {
  key: string;
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  unit?: "g" | "ml";
  serving?: { g: number; label: string };
  aliases?: string[];
};

export const BUILTIN_FOODS: BuiltinFood[] = [
  // Meat, fish, eggs
  { key: "chicken-breast-raw", name: "Chicken breast, raw, skinless", kcal: 106, p: 24, c: 0, f: 1.1, aliases: ["chicken"] },
  { key: "chicken-breast-cooked", name: "Chicken breast, cooked (grilled)", kcal: 148, p: 32, c: 0, f: 2.2, aliases: ["chicken"] },
  { key: "chicken-thigh-raw", name: "Chicken thigh, raw, skinless", kcal: 121, p: 19.7, c: 0, f: 4.1, aliases: ["chicken"] },
  { key: "turkey-breast-raw", name: "Turkey breast, raw", kcal: 105, p: 24, c: 0, f: 1, aliases: ["turkey"] },
  { key: "beef-mince-5", name: "Beef mince, 5% fat, raw", kcal: 125, p: 21.2, c: 0, f: 4.5, aliases: ["mince", "beef"] },
  { key: "beef-mince-20", name: "Beef mince, 20% fat, raw", kcal: 254, p: 17.2, c: 0, f: 20, aliases: ["mince", "beef"] },
  { key: "sirloin-raw", name: "Sirloin steak, raw, fat trimmed", kcal: 135, p: 22, c: 0, f: 5.2, aliases: ["steak", "beef"] },
  { key: "salmon-raw", name: "Salmon fillet, raw", kcal: 208, p: 20.4, c: 0, f: 13.4, aliases: ["fish"] },
  { key: "cod-raw", name: "Cod fillet, raw", kcal: 82, p: 18, c: 0, f: 0.7, aliases: ["fish", "white fish"] },
  { key: "tuna-tinned", name: "Tuna, tinned in spring water, drained", kcal: 109, p: 25, c: 0, f: 1, aliases: ["fish"] },
  { key: "prawns-cooked", name: "Prawns, cooked", kcal: 70, p: 15, c: 0, f: 0.9, aliases: ["shrimp"] },
  { key: "egg", name: "Egg, whole", kcal: 143, p: 12.6, c: 0.7, f: 9.5, serving: { g: 58, label: "1 large egg" }, aliases: ["eggs"] },
  { key: "egg-white", name: "Egg whites", kcal: 52, p: 10.9, c: 0.7, f: 0.2, aliases: ["egg"] },
  { key: "ham", name: "Ham, sliced", kcal: 107, p: 18, c: 1.4, f: 3.3, serving: { g: 25, label: "1 slice" } },
  { key: "tofu-firm", name: "Tofu, firm", kcal: 118, p: 12.6, c: 1.4, f: 7.3 },
  // Dairy
  { key: "greek-yoghurt-0", name: "Greek yoghurt, 0% fat", kcal: 54, p: 10.3, c: 3, f: 0, aliases: ["yogurt", "yoghurt"] },
  { key: "greek-yoghurt-5", name: "Greek yoghurt, 5% fat", kcal: 93, p: 9, c: 3, f: 5, aliases: ["yogurt", "yoghurt"] },
  { key: "skyr", name: "Skyr, natural", kcal: 64, p: 11, c: 4, f: 0.2, aliases: ["yogurt", "yoghurt"] },
  { key: "cottage-cheese", name: "Cottage cheese, low fat", kcal: 72, p: 12.6, c: 2.9, f: 1.5 },
  { key: "cheddar", name: "Cheddar cheese", kcal: 416, p: 25.4, c: 0.1, f: 34.9, serving: { g: 30, label: "1 portion (30 g)" }, aliases: ["cheese"] },
  { key: "milk-semi", name: "Semi-skimmed milk", kcal: 47, p: 3.5, c: 4.8, f: 1.7, unit: "ml" },
  { key: "milk-skimmed", name: "Skimmed milk", kcal: 34, p: 3.4, c: 5, f: 0.1, unit: "ml" },
  { key: "milk-whole", name: "Whole milk", kcal: 64, p: 3.4, c: 4.7, f: 3.6, unit: "ml" },
  { key: "oat-drink", name: "Oat drink (oat milk)", kcal: 46, p: 1, c: 6.7, f: 1.5, unit: "ml", aliases: ["oat milk"] },
  { key: "butter", name: "Butter", kcal: 717, p: 0.9, c: 0.1, f: 81.1, serving: { g: 10, label: "1 portion (10 g)" } },
  { key: "whey", name: "Whey protein powder (typical)", kcal: 400, p: 78, c: 7, f: 6, serving: { g: 30, label: "1 scoop (30 g)" }, aliases: ["protein shake", "protein powder"] },
  // Carbs
  { key: "oats", name: "Porridge oats", kcal: 374, p: 11, c: 60, f: 8, serving: { g: 40, label: "1 bowl (40 g)" }, aliases: ["porridge", "oatmeal"] },
  { key: "rice-white-dry", name: "White rice, uncooked", kcal: 365, p: 7.1, c: 78.7, f: 0.7, aliases: ["rice", "basmati"] },
  { key: "rice-white-cooked", name: "White rice, cooked", kcal: 130, p: 2.7, c: 27.8, f: 0.3, aliases: ["rice", "basmati"] },
  { key: "rice-brown-cooked", name: "Brown rice, cooked", kcal: 123, p: 2.7, c: 24, f: 1, aliases: ["rice"] },
  { key: "pasta-dry", name: "Pasta, uncooked", kcal: 357, p: 12.5, c: 71, f: 1.5, aliases: ["spaghetti", "penne"] },
  { key: "pasta-cooked", name: "Pasta, cooked", kcal: 158, p: 5.8, c: 29.1, f: 0.9, aliases: ["spaghetti", "penne"] },
  { key: "bread-white", name: "White bread", kcal: 235, p: 9, c: 44, f: 1.9, serving: { g: 38, label: "1 medium slice" }, aliases: ["toast"] },
  { key: "bread-wholemeal", name: "Wholemeal bread", kcal: 222, p: 10, c: 37, f: 2.5, serving: { g: 40, label: "1 medium slice" }, aliases: ["toast", "brown bread"] },
  { key: "bagel", name: "Bagel, plain", kcal: 257, p: 10, c: 48.4, f: 1.6, serving: { g: 85, label: "1 bagel" } },
  { key: "wrap", name: "Tortilla wrap, plain", kcal: 300, p: 8.5, c: 48, f: 7, serving: { g: 64, label: "1 wrap" } },
  { key: "potato-raw", name: "Potatoes, raw", kcal: 77, p: 2, c: 16, f: 0.1, aliases: ["potato"] },
  { key: "sweet-potato-raw", name: "Sweet potato, raw", kcal: 86, p: 1.6, c: 17.1, f: 0.1 },
  { key: "rice-cakes", name: "Rice cakes, plain", kcal: 387, p: 8, c: 80, f: 2.8, serving: { g: 8, label: "1 rice cake" } },
  { key: "wheat-biscuits", name: "Wholewheat cereal biscuits (e.g. Weetabix)", kcal: 362, p: 12, c: 69, f: 2, serving: { g: 37.5, label: "2 biscuits" }, aliases: ["weetabix", "cereal"] },
  { key: "quinoa-cooked", name: "Quinoa, cooked", kcal: 120, p: 4.4, c: 18.5, f: 1.9 },
  { key: "couscous-dry", name: "Couscous, uncooked", kcal: 376, p: 12.8, c: 72.4, f: 0.6 },
  { key: "baked-beans", name: "Baked beans in tomato sauce", kcal: 78, p: 4.7, c: 12.9, f: 0.2, serving: { g: 207, label: "½ tin" }, aliases: ["beans"] },
  { key: "chickpeas", name: "Chickpeas, tinned, drained", kcal: 121, p: 7.2, c: 15, f: 2.6 },
  { key: "lentils-cooked", name: "Lentils, cooked", kcal: 105, p: 8.8, c: 16.9, f: 0.4 },
  // Fruit
  { key: "banana", name: "Banana", kcal: 89, p: 1.1, c: 20.2, f: 0.3, serving: { g: 120, label: "1 medium banana" } },
  { key: "apple", name: "Apple", kcal: 52, p: 0.3, c: 11.4, f: 0.2, serving: { g: 150, label: "1 medium apple" } },
  { key: "orange", name: "Orange", kcal: 47, p: 0.9, c: 9.4, f: 0.1, serving: { g: 130, label: "1 medium orange" } },
  { key: "blueberries", name: "Blueberries", kcal: 57, p: 0.7, c: 12.1, f: 0.3, aliases: ["berries"] },
  { key: "strawberries", name: "Strawberries", kcal: 32, p: 0.7, c: 5.7, f: 0.3, aliases: ["berries"] },
  { key: "raspberries", name: "Raspberries", kcal: 25, p: 1.4, c: 4.6, f: 0.3, aliases: ["berries"] },
  { key: "grapes", name: "Grapes", kcal: 69, p: 0.7, c: 17.2, f: 0.2 },
  { key: "pineapple", name: "Pineapple", kcal: 50, p: 0.5, c: 11.7, f: 0.1 },
  { key: "mango", name: "Mango", kcal: 60, p: 0.8, c: 13.4, f: 0.4 },
  // Vegetables
  { key: "broccoli", name: "Broccoli", kcal: 34, p: 2.8, c: 4, f: 0.4, aliases: ["veg"] },
  { key: "spinach", name: "Spinach", kcal: 23, p: 2.9, c: 1.4, f: 0.4, aliases: ["veg"] },
  { key: "carrots", name: "Carrots", kcal: 35, p: 0.6, c: 7, f: 0.3, aliases: ["veg", "carrot"] },
  { key: "pepper", name: "Pepper, red", kcal: 32, p: 1, c: 6.4, f: 0.4, aliases: ["veg", "peppers"] },
  { key: "onion", name: "Onion", kcal: 40, p: 1.1, c: 7.6, f: 0.1, aliases: ["veg"] },
  { key: "tomatoes", name: "Tomatoes", kcal: 18, p: 0.9, c: 2.7, f: 0.2, aliases: ["veg", "tomato"] },
  { key: "cucumber", name: "Cucumber", kcal: 15, p: 0.7, c: 3.1, f: 0.1, aliases: ["veg", "salad"] },
  { key: "green-beans", name: "Green beans", kcal: 31, p: 1.8, c: 4.3, f: 0.2, aliases: ["veg"] },
  { key: "lettuce", name: "Lettuce / salad leaves", kcal: 15, p: 1.4, c: 1.6, f: 0.2, aliases: ["veg", "salad"] },
  { key: "peas", name: "Peas, frozen", kcal: 66, p: 6, c: 9.3, f: 0.9, aliases: ["veg"] },
  { key: "sweetcorn", name: "Sweetcorn", kcal: 86, p: 3.3, c: 16.7, f: 1.4, aliases: ["veg", "corn"] },
  { key: "mushrooms", name: "Mushrooms", kcal: 22, p: 3.1, c: 2.3, f: 0.3, aliases: ["veg", "mushroom"] },
  { key: "avocado", name: "Avocado", kcal: 160, p: 2, c: 1.8, f: 14.7, serving: { g: 75, label: "½ avocado" } },
  // Fats, snacks, extras
  { key: "olive-oil", name: "Olive oil", kcal: 884, p: 0, c: 0, f: 100, serving: { g: 14, label: "1 tbsp" }, aliases: ["oil"] },
  { key: "peanut-butter", name: "Peanut butter, smooth", kcal: 597, p: 25, c: 13, f: 50, serving: { g: 16, label: "1 tbsp" } },
  { key: "almonds", name: "Almonds", kcal: 579, p: 21.2, c: 9.1, f: 49.9, serving: { g: 30, label: "1 handful (30 g)" }, aliases: ["nuts"] },
  { key: "dark-chocolate", name: "Dark chocolate, 70%", kcal: 580, p: 7.8, c: 34, f: 42, serving: { g: 20, label: "2 squares (20 g)" }, aliases: ["chocolate"] },
  { key: "honey", name: "Honey", kcal: 304, p: 0.3, c: 82.4, f: 0, serving: { g: 7, label: "1 tsp" } },
  // Drinks
  { key: "cola", name: "Cola, regular", kcal: 42, p: 0, c: 10.6, f: 0, unit: "ml", serving: { g: 330, label: "1 can" }, aliases: ["coke", "fizzy"] },
  { key: "lager", name: "Lager (about 4%)", kcal: 41, p: 0.3, c: 3.1, f: 0, unit: "ml", serving: { g: 568, label: "1 pint" }, aliases: ["beer", "alcohol"] },
  { key: "wine-red", name: "Red wine", kcal: 85, p: 0.1, c: 2.6, f: 0, unit: "ml", serving: { g: 175, label: "1 medium glass" }, aliases: ["wine", "alcohol"] },
  { key: "wine-white", name: "White wine", kcal: 82, p: 0.1, c: 2.6, f: 0, unit: "ml", serving: { g: 175, label: "1 medium glass" }, aliases: ["wine", "alcohol"] },
];

export const BUILTIN_BY_KEY = new Map(BUILTIN_FOODS.map((f) => [f.key, f]));
