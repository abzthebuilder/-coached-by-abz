// The online coaching application form. Edit the wording here.

export const GOALS = [
  { key: "muscle", label: "Build muscle", profileGoal: "MUSCLE_GAIN" },
  { key: "fat", label: "Lose fat", profileGoal: "FAT_LOSS" },
  { key: "strength", label: "Get stronger", profileGoal: "STRENGTH" },
  { key: "confidence", label: "Feel more confident", profileGoal: "RECOMP" },
] as const;

export const EXPERIENCE = [
  { key: "beginner", label: "New to training" },
  { key: "returning", label: "Getting back into it" },
  { key: "experienced", label: "Experienced lifter" },
] as const;

export const TRAINS_AT = [
  { key: "gym", label: "A gym" },
  { key: "home", label: "At home" },
  { key: "both", label: "Both" },
] as const;

export const HEARD_FROM = ["Instagram", "YouTube", "A friend", "Google", "Other"] as const;

/** Standard pre-exercise screening questions. A "yes" means: get a GP's OK before starting. */
export const HEALTH_QUESTIONS = [
  { key: "heart", q: "Has a doctor ever said you have a heart condition, or that you should only do exercise a doctor recommends?" },
  { key: "chestPain", q: "Do you get chest pain, either at rest or when you exercise?" },
  { key: "dizziness", q: "Have you ever lost your balance because of dizziness, or lost consciousness?" },
  { key: "conditions", q: "Do you have high or low blood pressure, diabetes, asthma or another medical condition?" },
  { key: "injury", q: "Do you have a bone, joint or muscle problem, or a current injury, that exercise could make worse?" },
  { key: "medication", q: "Are you taking any medication that could affect exercise (for example for blood pressure or your heart)?" },
  { key: "pregnancy", q: "Are you pregnant, or have you had a baby in the last six months?" },
  { key: "eatingDisorder", q: "Do you have, or have you had, an eating disorder?" },
  { key: "other", q: "Is there any other reason you think you shouldn't do physical activity?" },
] as const;

export const labelFor = (list: readonly { key: string; label: string }[], key: string) => list.find((x) => x.key === key)?.label ?? key;
