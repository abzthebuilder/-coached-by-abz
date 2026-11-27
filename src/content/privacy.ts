// The privacy policy text. Plain English, written for UK GDPR.
// Retention periods and the 18+ rule are business choices: change them here if you decide differently.

export const PRIVACY_CONTACT = "ablofe1@gmail.com";
export const PRIVACY_UPDATED = "27 November 2026";

export type PrivacySection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export const privacySections: PrivacySection[] = [
  {
    heading: "Who I am",
    paragraphs: [
      "Coached by ABZ is an online fitness coaching business run by ABZ in the UK. I'm responsible for the personal information you share with me (in data protection terms, I'm the \"controller\").",
      `If you have any questions about your information, or want to use any of your rights below, email me at ${PRIVACY_CONTACT}.`,
    ],
  },
  {
    heading: "What I collect",
    bullets: [
      "When you apply: what you enter in the application form, such as your name, email, Instagram username (if you give it), goals, training history and anything you tell me about injuries.",
      "When you become a client: your name, email address and timezone, plus a password. Your password is stored scrambled (hashed), so I can never see it.",
      "What you log in the app: body weight, body measurements, your food diary, calories and macros, steps, workouts (exercises, weights and reps), check-in answers (sleep, energy, how training and nutrition went, wins, struggles and questions) and progress photos.",
      "If you join the community chat (optional): the name you choose, your messages, reactions and any messages you report.",
      "What I add as your coach: your training plan, nutrition targets, tasks, replies to your check-ins and private notes to help me coach you.",
      "Technical information: one cookie that keeps you logged in, and basic server logs (such as IP addresses) that my hosting provider keeps for security.",
    ],
  },
  {
    heading: "Your health information",
    paragraphs: [
      "Anything you tell me about injuries or your health when you apply, body weight, measurements, progress photos and parts of your check-ins count as health information, which UK data protection law treats as extra sensitive.",
      "I only use it with your explicit consent, which you give when you apply and when you create your account. You can withdraw that consent at any time by emailing me. I'll then stop using it and delete it, although I won't be able to keep coaching you without it.",
    ],
  },
  {
    heading: "Why I use it",
    bullets: [
      "To coach you: building your plan, setting your targets, tracking your progress and replying to your check-ins. This is the service you've signed up for.",
      "To use your health information: your explicit consent, as above.",
      "To keep the app secure and working properly, which is in both our interests.",
      "I don't use your information for advertising, and I never sell it.",
    ],
  },
  {
    heading: "Who can see it",
    paragraphs: [
      "Only you and me. Other clients can't see anything about you, unless you join the community chat, where members see your chosen name and what you post.",
      "I use two service providers, who handle information only so they can provide their service to me:",
    ],
    bullets: [
      "Railway hosts the app and its database. Your information, including your progress photos, is stored on Railway's servers in Amsterdam, the Netherlands. Railway is a US company, so in limited cases (such as technical support) information may be accessed from outside the UK. Where that happens it's protected by Railway's data processing terms.",
      "If I use Tally (an online forms service) for applications instead of the form on this site, Tally stores what you enter.",
      "Open Food Facts, a free public food database, is used when you search for a food or scan a barcode. Only the words you search for or the barcode number are sent, never your name or anything else about you. Barcode scanning happens on your phone: the camera picture is never uploaded.",
      "Resend sends the app's emails, such as invites, password resets, check-in reminders and reply notifications. These emails never contain your health information, only a link to log in. Resend is a US company, and your email address is protected by its data processing terms.",
    ],
  },
  {
    heading: "Community chat",
    paragraphs: [
      "The community chat is optional. If you join, everyone in it (ABZ and other clients who've joined) can see the name you choose and what you post. Nothing else about you is shared: your logs, photos, check-ins and targets always stay private.",
      "You can delete your own messages at any time. If you leave, your messages and reactions are deleted. ABZ can delete messages and remove members who break the community rules.",
    ],
  },
  {
    heading: "Progress photos",
    paragraphs: [
      "Your progress photos are private. They're stored securely and only shown to you and me when we're logged in.",
      "I'll never post or share your photos or results (for example on social media or this website) unless you've given me separate, written permission for that specific use.",
    ],
  },
  {
    heading: "Cookies",
    paragraphs: [
      "This site uses one essential cookie to keep you logged in. There are no advertising or tracking cookies, and no analytics. Your browser may also remember small choices you make, such as hiding a tip.",
    ],
  },
  {
    heading: "How long I keep it",
    bullets: [
      "While you're a client, I keep your information so I can coach you and you can see your progress.",
      "When coaching ends, I delete your account and coaching information within 12 months, or sooner if you ask.",
      "If you apply but don't become a client, I delete your application within 12 months.",
      "Backups are deleted automatically within 3 months.",
    ],
  },
  {
    heading: "Your rights",
    paragraphs: ["You have the right to:"],
    bullets: [
      "get a copy of your information",
      "have anything that's wrong corrected",
      "have your information deleted",
      "ask me to limit how I use it, or object to how I use it",
      "get your information in a format you can take elsewhere",
      "withdraw your consent at any time",
    ],
  },
  {
    heading: "How to use your rights",
    paragraphs: [
      `Clients can download a copy of their information at any time from the Account page in the app. For anything else, email me at ${PRIVACY_CONTACT}. I'll reply within one month.`,
    ],
  },
  {
    heading: "Keeping it secure",
    paragraphs: [
      "The app only works over a secure (HTTPS) connection, passwords are hashed, progress photos are never public, and every account can only see its own records.",
    ],
  },
  {
    heading: "Age",
    paragraphs: ["You need to be 18 or over to create a client account."],
  },
  {
    heading: "Complaints",
    paragraphs: [
      "If you're unhappy with how I've handled your information, please tell me first so I can put it right.",
      "You can also complain to the Information Commissioner's Office (ICO), the UK's data protection regulator, at ico.org.uk or on 0303 123 1113.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: [
      "If I change this policy, I'll update it here and change the date below. If a change affects how I use your health information, I'll tell you first.",
    ],
  },
];
