// All public-site wording lives here so it can be edited without touching layout code.
// Gym photos live in /public/images under the file names below.
// If a photo is missing, the hero and story show a branded panel; other spots are simply hidden.

export type Photo = { file: string; alt: string; position?: string };

export const photos: Record<"hero" | "about" | "online" | "gym" | "banner", Photo> = {
  hero: { file: "hero.jpg", alt: "ABZ doing cable curls in the gym", position: "50% 40%" },
  about: { file: "about.jpg", alt: "ABZ at 15, skinny and just starting out, next to ABZ today" },
  online: { file: "online.jpg", alt: "ABZ loading a plate in the gym", position: "50% 35%" },
  gym: { file: "gym.jpg", alt: "ABZ in the gym", position: "50% 15%" },
  banner: { file: "banner.jpg", alt: "ABZ facing the gym mirror before a session", position: "50% 38%" },
};

export const hero = {
  eyebrow: "Online coaching",
  title: ["Build muscle.", "Lose fat.", "Get stronger."],
  lead:
    "Coaching built around your life, not the other way round. Whether it's your first time in the gym, you're getting back into it, or you've been lifting for years, I'll give you a clear plan, keep you accountable and show you how to keep the results.",
};

export const outcomes = [
  { title: "Build muscle", body: "Structured training that progresses week to week, so you're always building on what you did last time." },
  { title: "Lose fat", body: "Calorie and macro targets you can actually stick to, with food you enjoy, so you don't have to crash diet." },
  { title: "Get stronger", body: "Learn the main lifts properly, track every session, and watch the numbers go up." },
  { title: "Feel confident", body: "In the gym, in your clothes and in yourself. You'll know what to do, why you're doing it and that it's working." },
];

export const audiences = [
  {
    title: "Beginners",
    body: "Never followed a plan before? We start with the basics: how to move well, how to set up each exercise, and a simple routine you can follow from day one. No judgement and no jargon.",
  },
  {
    title: "Returning to the gym",
    body: "Had time off with work, family or injury? We rebuild sensibly so you get your strength and routine back without burning out or getting hurt.",
  },
  {
    title: "Experienced lifters",
    body: "Stuck at the same weights or the same body for a while? You'll get proper programming, honest feedback and the accountability to push past it.",
  },
];

export const story = {
  eyebrow: "My story",
  title: "Where it started",
  paragraphs: [
    "I got into training when I was about 15. I was skinny, I wanted to change my physique, and I wanted to feel more confident in myself. I couldn't afford a gym, so I trained at a calisthenics park instead, even in the rain and the dark.",
    "My turning point was realising that training was changing more than my body. Showing up and making progress gave me confidence, built my discipline and helped me believe in what I could achieve. I started feeling stronger mentally as well as physically.",
    "That's what I want to help you with through Coached by ABZ: building a physique you're proud of, while becoming more confident in yourself along the way.",
  ],
  signoff: "ABZ",
};

export const services = {
  online: {
    title: "Online Coaching",
    tagline: "Your plan, your schedule, my eyes on your progress.",
    points: [
      "A training plan built for your goal, your equipment and how many days you can train",
      "Calorie, protein, carb and fat targets, plus a daily step goal",
      "Your own app to log workouts, food totals and steps",
      "Weekly or monthly check-ins with a personal reply from me",
      "Your plan adjusted as you progress, so you don't stall",
    ],
  },
};

export const expectations = [
  { title: "A plan made for you", body: "No copy-and-paste programmes. Your training and nutrition are set from your goal, schedule and starting point." },
  { title: "Clear targets", body: "You'll always know your calories, macros, step goal and next workout. They're all on your Today screen." },
  { title: "Real accountability", body: "Regular check-ins where you tell me how it's going, and I reply with what to change and what to keep doing." },
  { title: "Progress you can see", body: "Weight trends, lift history, measurements and side-by-side photos, all private and all in one place." },
];

export const steps = [
  { n: "01", title: "Apply", body: "Fill in a short application telling me about your goals, your training history and your schedule." },
  { n: "02", title: "We talk", body: "I get back to you personally, and we go through your goals, your history and anything that's held you back before." },
  { n: "03", title: "Get your plan", body: "You get your login, your training plan and your targets. Then we get to work." },
];

export const faqs = [
  { q: "I'm a complete beginner. Is this for me?", a: "Yes. Every exercise comes with coaching notes, and we build up at your pace." },
  { q: "Do I need a gym?", a: "A gym gives you the most options, but I started out training in a park, so plans can be written around home, outdoor or limited equipment. Tell me what you've got when you apply." },
  { q: "Will I have to give up foods I enjoy?", a: "No. You get targets, not a banned list. We fit the foods you like into a plan you can keep up." },
  { q: "How do check-ins work?", a: "You fill in a short form in the app every week or month covering weight, sleep, energy, training, nutrition, wins and struggles. I reply personally." },
];
