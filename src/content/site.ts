// All public-site wording lives here so it can be edited without touching layout code.
// Gym photos: drop your own files into /public/images using the file names below.
// If a file is missing the site shows a branded panel instead, so nothing breaks.

export const photos = {
  hero: { file: "hero.jpg", alt: "ABZ training in the gym" },
  about: { file: "about.jpg", alt: "ABZ coaching a client on the gym floor" },
  online: { file: "online.jpg", alt: "Client following an online training plan" },
  pt: { file: "pt.jpg", alt: "ABZ running a 1:1 personal training session" },
  strip1: { file: "gym-1.jpg", alt: "Heavy compound lift in the gym" },
  strip2: { file: "gym-2.jpg", alt: "Dumbbell work during a session" },
  strip3: { file: "gym-3.jpg", alt: "Client and coach reviewing progress" },
} as const;

export const hero = {
  eyebrow: "Online coaching · 1:1 personal training",
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
  title: "Why I coach",
  paragraphs: [
    "I didn't start out knowing what I was doing in the gym. I wasted years on random workouts, copied plans that didn't fit my life, and swung between eating everything and eating nothing. Nothing really changed until I learned to train with structure, eat with a plan and stay consistent when motivation ran out.",
    "That's what I teach now. Most people don't need more motivation. They need a plan that fits their week, someone to check in with and a clear way to see that it's working.",
    "Every client gets the same thing from me: honest coaching, a plan built for them, and someone in their corner who notices the small wins as well as the big ones.",
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
  pt: {
    title: "1:1 Personal Training",
    tagline: "In the gym together, every rep coached.",
    points: [
      "Hands-on coaching on technique, setup and breathing",
      "Sessions planned around your goal and any injuries",
      "Pushed hard enough to progress, kept safe enough to keep showing up",
      "Includes access to the client app to track your training and progress between sessions",
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
  { n: "01", title: "Apply or book", body: "Apply for online coaching, or book a free PT consultation if you'd like to train with me in person." },
  { n: "02", title: "We talk", body: "We go through your goals, your history, your schedule and anything that's held you back before." },
  { n: "03", title: "Get your plan", body: "You get your login, your training plan and your targets. Then we get to work." },
];

export const faqs = [
  { q: "I'm a complete beginner. Is this for me?", a: "Yes. Plenty of my clients start from zero. Every exercise comes with coaching notes, and we build up at your pace." },
  { q: "Do I need a gym?", a: "A gym gives you the most options, but plans can be written around home or limited equipment. Tell me what you've got when you apply." },
  { q: "Will I have to give up foods I enjoy?", a: "No. You get targets, not a banned list. We fit the foods you like into a plan you can keep up." },
  { q: "How do check-ins work?", a: "You fill in a short form in the app every week or month covering weight, sleep, energy, training, nutrition, wins and struggles. I reply personally." },
];
