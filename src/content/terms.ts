// Terms of service and health disclaimer. Plain English, for an online coaching business in the UK.
import { PRIVACY_CONTACT } from "./privacy";

export const TERMS_UPDATED = "24 November 2026";

export type TermsSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export const healthDisclaimer: TermsSection[] = [
  {
    heading: "Not medical advice",
    paragraphs: [
      "My coaching, training plans and nutrition guidance are for general fitness purposes. They aren't medical advice, and they don't replace a doctor, physiotherapist or registered dietitian.",
    ],
  },
  {
    heading: "Check with your GP first if",
    bullets: [
      "you have a heart condition, high or low blood pressure, diabetes, asthma or any other medical condition",
      "you've had chest pain, fainting or dizziness, or a doctor has ever told you to limit exercise",
      "you have an injury, joint problem or recent surgery",
      "you're pregnant or have had a baby in the last six months",
      "you're taking any medication that could affect exercise",
      "you have, or have had, an eating disorder",
    ],
  },
  {
    heading: "While you train",
    bullets: [
      "Stop straight away and get medical help if you feel chest pain, severe breathlessness, dizziness, faintness or sharp pain.",
      "Train within your limits, use good technique and safe equipment, and don't train through pain.",
      "Tell me about any injury, health change or medication as soon as it happens, so I can adjust your plan.",
    ],
  },
];

export const termsSections: TermsSection[] = [
  {
    heading: "About these terms",
    paragraphs: [
      "These terms cover Coached by ABZ online coaching and the client app. By creating an account, you agree to them. If anything here isn't clear, email me before you start.",
    ],
  },
  {
    heading: "What you get",
    bullets: [
      "A training plan and nutrition targets set for your goals",
      "Access to the client app to log your training, nutrition, steps and progress",
      "Check-ins on the schedule we agree, with a personal reply from me",
    ],
    paragraphs: [
      "What's included, how long coaching lasts, the price, how you pay and how cancellation works are agreed with you before you start.",
    ],
  },
  {
    heading: "Your part",
    bullets: [
      "Give me honest, up-to-date information, including about your health, injuries and medication.",
      "Follow the health guidance on this page.",
      "Keep your login details private. Your account is for you only.",
      "Be respectful in your check-ins and messages.",
    ],
  },
  {
    heading: "Community chat",
    paragraphs: [
      "Joining the community chat is optional. If you join, please follow the community rules shown in the app. Anything shared there is between members: it isn't advice from a medical professional, and ABZ isn't responsible for what other members post. ABZ can delete messages and remove anyone from the community who breaks the rules.",
    ],
  },
  {
    heading: "Results",
    paragraphs: [
      "Everyone's body and circumstances are different, and results depend on a lot of things, including how consistently you follow the plan. I'll always do my best for you, but I can't guarantee specific results.",
    ],
  },
  {
    heading: "Your plan and my content",
    paragraphs: [
      "Training plans, templates and other coaching material I create are for your personal use. Please don't share, sell or publish them.",
    ],
  },
  {
    heading: "The app",
    paragraphs: [
      "I'll do my best to keep the app running and your information safe, but it may occasionally be unavailable, for example during updates. I can suspend or close an account that's misused, and I'll tell you why.",
    ],
  },
  {
    heading: "Responsibility",
    paragraphs: [
      "You take part in training at your own risk and are responsible for following the health guidance on this page. Nothing in these terms limits my responsibility where the law doesn't allow it to be limited, including for death or personal injury caused by my negligence, and nothing affects your legal rights as a consumer.",
    ],
  },
  {
    heading: "Ending coaching",
    paragraphs: [
      `You can stop coaching by emailing ${PRIVACY_CONTACT}. Notice periods and any refunds follow what we agreed before you started. Your information is then handled as explained in the privacy policy.`,
    ],
  },
  {
    heading: "Age",
    paragraphs: ["You need to be 18 or over to create a client account."],
  },
  {
    heading: "Changes and law",
    paragraphs: [
      "If I change these terms, I'll update them here and change the date below, and I'll tell you about any important changes.",
      "These terms are governed by the law of England and Wales. If you live in Scotland or Northern Ireland, you can also bring a claim in your local courts.",
    ],
  },
];
