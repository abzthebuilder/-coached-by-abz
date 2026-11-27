// End-to-end check of the coach and client journeys on a phone, plus data isolation
// between two client accounts. Needs the demo seed (npm run db:seed) for the coach login and
// "Upper A" template, and a running server started with EMAIL_DEV_LOG=<file> DISABLE_REMINDERS=1
// so emails are written to that file instead of being sent:
//   EMAIL_DEV_LOG=/tmp/emails.jsonl DISABLE_REMINDERS=1 npm start
//   EMAIL_DEV_LOG=/tmp/emails.jsonl BASE_URL=http://localhost:3000 npm run test:e2e
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import path from "node:path";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.env.NODE_PATH || "/opt/node22/lib/node_modules", "playwright")); }
const { chromium, devices } = pw;
const { PrismaClient } = require(path.resolve("node_modules/@prisma/client"));
const { PrismaPg } = require(path.resolve("node_modules/@prisma/adapter-pg"));
require(path.resolve("node_modules/dotenv")).config();
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { unzipSync, strFromU8 } = require(path.resolve("node_modules/fflate"));

const EMAIL_LOG = process.env.EMAIL_DEV_LOG;
if (!EMAIL_LOG) throw new Error("Set EMAIL_DEV_LOG to the same file the server writes emails to.");
const mailsTo = (to) =>
  fs.existsSync(EMAIL_LOG) ? fs.readFileSync(EMAIL_LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((m) => m.to === to) : [];
const linkIn = (mail) => mail.text.match(/https?:\/\/\S+/)[0];
const storageRoot = path.resolve(process.env.STORAGE_DIR || (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "photos") : "storage"));
const unzip = async (res) => {
  assert.equal(res.status(), 200, "export downloaded");
  assert.equal(res.headers()["content-type"], "application/zip");
  const files = unzipSync(new Uint8Array(await res.body()));
  return { files, json: JSON.parse(strFromU8(files["data.json"])), text: (n) => strFromU8(files[n]) };
};
const COACH_EMAIL = "coach@demo.coachedbyabz.com";
const OFF_STUB = process.env.OFF_STUB_URL || "http://localhost:4010";
try {
  await fetch(`${OFF_STUB}/api/v2/product/5000000000012`);
} catch {
  throw new Error(`Start the food database stub first (node tests/e2e/off-stub.mjs 4010) and run the app with OFF_BASE_URL=${OFF_STUB}`);
}
async function fillApplication(page, who) {
  await page.getByLabel("Your name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  if (who.instagram) await page.getByLabel("Instagram (optional)").fill(who.instagram);
  const pick = (name, value) => page.locator(`label:has(input[name="${name}"][value="${value}"])`).click();
  await pick("goal", "muscle");
  await page.getByLabel("Tell me about your goals").fill(who.about ?? "Want to get in better shape");
  await pick("experience", "returning");
  await pick("daysPerWeek", "4");
  await pick("trainsAt", "gym");
  if (who.injuries) await page.getByLabel("Any injuries, or anything else I should know? (optional)").fill(who.injuries);
  await page.locator('input[name="terms"]').check();
  await page.locator('input[name="consent"]').check();
}
let leadId;
const todayLondon = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

const base = process.env.BASE_URL || "http://localhost:3000";
const run = Date.now().toString(36);
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(["PASS", name]); console.log("✓", name); }
  catch (e) { results.push(["FAIL", name]); console.error("✗", name, "\n  ", e.message.split("\n")[0]); throw e; }
};
// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

const browser = await chromium.launch();
const phone = () => browser.newContext({ ...devices["iPhone 13"], baseURL: base });
async function login(page, email, password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/(app|coach)/);
}

const coachCtx = await phone();
const coach = await coachCtx.newPage();
const clients = { A: { name: `Alpha Test ${run}`, email: `alpha.${run}@test.coachedbyabz.com`, password: "alpha-password-123" }, B: { name: `Bravo Test ${run}`, email: `bravo.${run}@test.coachedbyabz.com`, password: "bravo-password-123" } };

try {
  await step("Public site shows Apply + Client Login, with no pricing or personal training", async () => {
    const p = await coachCtx.newPage();
    await p.goto("/");
    for (const n of ["Apply for Online Coaching", "Client Login"]) assert.ok(await p.getByRole("link", { name: n }).first().isVisible(), n);
    assert.equal(await p.getByRole("link", { name: "Apply for Online Coaching" }).first().getAttribute("href"), "/apply", "Apply goes to the built-in form");
    for (const u of ["/", "/coaching", "/about", "/get-started", "/privacy", "/apply"]) {
      await p.goto(u);
      const text = await p.locator("body").innerText();
      assert.ok(!/£|€|\$\d|per month|per week|pricing|package/i.test(text), `no pricing on ${u}`);
      assert.ok(!/personal training|PT consultation|calendly/i.test(text), `no personal training on ${u}`);
    }
    await p.goto("/terms");
    await p.getByRole("heading", { name: "Health disclaimer", exact: true }).waitFor();
    assert.ok(await p.getByRole("link", { name: "Terms" }).first().isVisible(), "terms link in footer");
    const manifest = await (await p.request.get("/manifest.webmanifest")).json();
    assert.equal(manifest.name, "Coached by ABZ");
    assert.equal(manifest.display, "standalone");
    for (const u of ["/apple-icon", "/icon/192", "/icon/512", "/opengraph-image"]) {
      const r = await p.request.get(u);
      assert.equal(r.status(), 200, u);
      assert.equal(r.headers()["content-type"], "image/png", u);
    }
    await p.goto("/");
    assert.ok(await p.locator('meta[property="og:image"]').count(), "link preview image set");
    await p.goto("/privacy");
    assert.ok(await p.getByRole("link", { name: "ablofe1@gmail.com" }).first().isVisible(), "privacy contact shown");
    await p.close();
  });

  await step("Coach logs in on a phone", () => login(coach, "coach@demo.coachedbyabz.com", "coach-demo-pass-1"));

  for (const k of ["A", "B"]) {
    await step(`Coach invites client ${k}; client accepts and lands on Today`, async () => {
      await coach.goto("/coach");
      await coach.getByLabel("Client name").fill(clients[k].name);
      await coach.getByLabel("Client email").fill(clients[k].email);
      await coach.getByRole("button", { name: "Create invite link" }).click();
      const link = await coach.getByLabel("Link").inputValue();
      assert.match(link, /\/invite\//);
      await coach.getByText(`Invite emailed to ${clients[k].email}`).waitFor();
      const invite = mailsTo(clients[k].email).at(-1);
      assert.ok(invite && invite.subject.includes("ready to set up") && linkIn(invite) === link, "invite email has the link");
      const ctx = await phone();
      const p = await ctx.newPage();
      await p.goto(link.replace(/^https?:\/\/[^/]+/, base));
      await p.getByLabel("Password", { exact: true }).fill(clients[k].password);
      await p.getByLabel("Confirm password").fill(clients[k].password);
      if (k === "A") {
        // The server refuses an account without health data consent, even if the browser check is bypassed.
        await p.locator('input[name="terms"]').check();
        await p.locator('input[name="consent"]').evaluate((el) => el.removeAttribute("required"));
        await p.getByRole("button", { name: "Create my account" }).click();
        await p.getByText("Please tick the box to agree to the privacy policy").waitFor();
      }
      await p.locator('input[name="terms"]').check(); // 18+ and terms
      await p.locator('input[name="consent"]').check(); // health data consent (separate, as UK GDPR expects)
      await p.getByRole("button", { name: "Create my account" }).click();
      await p.waitForURL(/\/app/);
      assert.ok(await p.getByText("You're in.").isVisible());
      const prof = await db.clientProfile.findFirst({ where: { user: { email: clients[k].email } } });
      assert.ok(prof?.healthConsentAt instanceof Date, "consent date recorded");
      assert.ok(prof?.termsAcceptedAt instanceof Date, "terms acceptance recorded");
      clients[k].ctx = ctx; clients[k].page = p;
      // invite link is single-use
      const p2 = await (await phone()).newPage();
      await p2.goto(link.replace(/^https?:\/\/[^/]+/, base));
      assert.ok(await p2.getByText("Invite expired").isVisible(), "used invite rejected");
      await p2.context().close();
    });
  }
  const A = clients.A.page, B = clients.B.page;
  const profA = await db.clientProfile.findFirst({ where: { user: { email: clients.A.email } } });
  const profB = await db.clientProfile.findFirst({ where: { user: { email: clients.B.email } } });

  await step("Coach assigns a plan from a template, sets targets via macro calculator, adds a task", async () => {
    await coach.goto(`/coach/clients/${profA.id}?view=plan`);
    await coach.getByLabel("Plan name").fill("Test block");
    await coach.getByLabel("Workouts per week").fill("3");
    await coach.getByRole("button", { name: "Create plan" }).click();
    await coach.getByText("New plan created").waitFor();
    await coach.reload();
    await coach.getByLabel("Template").selectOption({ label: "Upper A" });
    await coach.getByRole("button", { name: "Add", exact: true }).click();
    await coach.getByText("Upper A").first().waitFor();

    await coach.goto(`/coach/clients/${profA.id}?view=nutrition`);
    await coach.getByLabel("Calorie target (kcal)").fill("2410");
    await coach.getByLabel("Protein (g)").fill("185");
    await coach.getByLabel("Fat (g)").fill("70");
    await coach.getByLabel("Daily step goal").fill("9000");
    assert.ok(await coach.getByText("260", { exact: false }).first().isVisible(), "carbs = 260 g");
    await coach.getByRole("button", { name: "Review targets" }).click();
    await coach.getByText("Review before saving").waitFor();
    await coach.getByRole("button", { name: "Save to profile" }).click();
    await coach.getByText("Targets saved").waitFor();
    const t = await db.nutritionTarget.findFirst({ where: { clientId: profA.id } });
    assert.deepEqual([t.calories, t.proteinG, t.carbsG, t.fatG, t.stepGoal], [2410, 185, 260, 70, 9000]);

    await coach.goto(`/coach/clients/${profA.id}?view=tasks`);
    await coach.getByLabel("Task").fill("Walk after dinner");
    await coach.getByRole("button", { name: "Assign task" }).click();
    await coach.getByText("Task assigned").waitFor();
  });

  await step("Client A: Today shows workout, targets, task; Log Steps is one tap", async () => {
    await A.goto("/app");
    await A.getByText("Use it like an app.").waitFor();
    await A.getByRole("button", { name: "Hide this tip" }).click();
    await A.reload();
    await A.getByRole("heading", { name: "Upper A" }).waitFor();
    assert.equal(await A.getByText("Use it like an app.").count(), 0, "tip stays hidden once dismissed");
    assert.ok(await A.getByRole("heading", { name: "Upper A" }).isVisible());
    assert.ok(await A.getByText("/ 2,410 kcal").isVisible());
    assert.ok(await A.getByText("Walk after dinner").isVisible());
    await A.getByRole("button", { name: "Log Steps" }).click();
    await A.getByLabel("Steps today").fill("10432");
    await A.getByRole("button", { name: "Save steps" }).click();
    await A.getByText("Steps saved").waitFor();
    await A.waitForTimeout(1200);
    await A.reload();
    assert.ok(await A.getByText("10,432").first().isVisible());
  });

  await step("Client A logs a workout, then sees last time on the next one", async () => {
    await A.goto("/app");
    await A.getByRole("link", { name: "Start Upper A" }).click();
    await A.getByText("First time logging this one.").first().waitFor();
    await A.getByLabel("Bench Press set 1 weight in kg").fill("60");
    await A.getByLabel("Bench Press set 1 reps").fill("8");
    await A.getByLabel("Bench Press set 2 weight in kg").fill("62.5");
    await A.getByLabel("Bench Press set 2 reps").fill("6");
    await A.getByRole("button", { name: /Finish/ }).click();
    await A.waitForURL(/logged=1/);
    const pwId = (await db.planWorkout.findFirst({ where: { plan: { clientId: profA.id } } })).id;
    clients.A.planWorkoutId = pwId;
    await A.goto(`/app/training/log/${pwId}`);
    assert.ok(await A.getByText("60kg × 8, 62.5kg × 6").isVisible(), "last time shown");
    await A.goto("/app/progress?tab=lifts");
    assert.ok(await A.getByText("60kg × 8").first().isVisible() || (await A.getByText("62.5kg × 6").first().isVisible()));
  });

  await step("Client A logs daily totals and a private photo; tapping the chart reads a day, unlogged days stay blank", async () => {
    await A.goto("/app/nutrition");
    await A.getByLabel("Calories (kcal)").fill("2350");
    await A.getByLabel("Protein (g)").fill("190");
    await A.getByLabel("Body weight (kg)").fill("84.2");
    await A.getByRole("button", { name: /^Save today/ }).click();
    await A.getByText("Log saved").waitFor();
    await A.goto("/app/progress");
    const chart = A.locator("svg[role=img][tabindex='0']");
    const box = await chart.boundingBox();
    await A.mouse.click(box.x + box.width - 60, box.y + box.height / 2); // today (right edge)
    await A.getByText("2,350").first().waitFor();
    await A.mouse.click(box.x + 20, box.y + box.height / 2); // 30 days ago: nothing logged
    await A.getByText("Not logged").waitFor();
    await A.goto("/app/progress?tab=photos");
    await A.getByText("+ Upload a progress photo").click();
    await A.locator("input[type=file]").setInputFiles({ name: "front.png", mimeType: "image/png", buffer: PNG });
    await A.getByRole("button", { name: "Upload photo" }).click();
    await A.getByText("Photo uploaded").waitFor();
    const r = await A.request.get((await db.progressPhoto.findFirst({ where: { clientId: profA.id } })).id.replace(/^/, "/api/photos/"));
    assert.equal(r.status(), 200);
  });

  await step("Client A logs food: common food, product search, barcode, own food from a label, quick add", async () => {
    await A.goto("/app");
    await A.getByRole("link", { name: "Log Food" }).click();
    await A.waitForURL(/\/app\/nutrition\/add/);
    // A common food from the built-in list
    await A.getByLabel("Search foods").fill("banana");
    await A.getByRole("button", { name: "Search" }).click();
    await A.getByRole("button", { name: /^Banana/ }).click();
    await A.getByRole("button", { name: /^Add to/ }).click();
    await A.waitForURL(/added=1/);
    await A.getByText("Added to your food diary.").waitFor();
    // A supermarket product from the food database, into Breakfast, by grams
    await A.getByRole("link", { name: "Add food to Breakfast" }).click();
    await A.getByLabel("Search foods").fill("yogurt");
    await A.getByRole("button", { name: "Search" }).click();
    await A.getByRole("button", { name: /Greek Style Yogurt/ }).click();
    await A.getByRole("button", { name: "Grams" }).click();
    await A.getByLabel("Amount in g").fill("200");
    await A.getByText("120", { exact: true }).waitFor(); // 60 kcal per 100 g x 200 g
    await A.getByRole("button", { name: "Add to breakfast" }).click();
    await A.waitForURL(/added=1/);
    // Barcode typed in by hand, 2 servings, into Snacks
    await A.getByRole("link", { name: "Add food to Snacks" }).click();
    await A.getByRole("tab", { name: "Scan" }).click();
    await A.getByLabel("Barcode number").fill("5000000000029");
    await A.getByRole("button", { name: "Look up" }).click();
    await A.getByRole("heading", { name: "Chocolate Protein Bar" }).waitFor();
    await A.getByLabel("Number of servings").fill("2");
    await A.getByRole("button", { name: "Add to snacks" }).click();
    await A.waitForURL(/added=1/);
    // Unknown barcode: create it from the label once, then log it
    await A.getByRole("link", { name: "Add food to Snacks" }).click();
    await A.getByRole("tab", { name: "Scan" }).click();
    await A.getByLabel("Barcode number").fill("5012345678900");
    await A.getByRole("button", { name: "Look up" }).click();
    await A.getByText("That barcode isn't in the database yet").waitFor();
    assert.equal(await A.getByLabel("Barcode (optional)").inputValue(), "5012345678900");
    await A.getByLabel("Food name").fill(`Homemade flapjack ${run}`);
    await A.getByLabel("Calories per 100 g").fill("420");
    await A.getByLabel("Protein (g) per 100 g").fill("8");
    await A.getByLabel("Carbs (g) per 100 g").fill("55");
    await A.getByLabel("Fat (g) per 100 g").fill("18");
    await A.getByLabel("Serving size (g, optional)").fill("50");
    await A.getByLabel("Serving name (optional)").fill("1 square");
    await A.getByRole("button", { name: "Save food" }).click();
    await A.getByRole("heading", { name: `Homemade flapjack ${run}` }).waitFor();
    await A.getByRole("button", { name: "Add to snacks" }).click();
    await A.waitForURL(/added=1/);
    // Quick add for a meal out, into Dinner
    await A.getByRole("link", { name: "Add food to Dinner" }).click();
    await A.getByRole("tab", { name: "Quick add" }).click();
    await A.getByLabel("What was it? (optional)").fill("Chicken wrap, meal out");
    await A.getByLabel("Calories").fill("650");
    await A.getByLabel("Protein (g)").fill("40");
    await A.getByRole("button", { name: "Add to dinner" }).click();
    await A.waitForURL(/added=1/);

    // Totals: banana 107 + yogurt 120 + 2 bars 420 + flapjack 210 + wrap 650 = 1507 kcal
    const day = todayLondon();
    const log = await db.dailyLog.findUnique({ where: { clientId_day: { clientId: profA.id, day } } });
    assert.equal(log.fromDiary, true, "totals come from the diary");
    assert.equal(log.calories, 1507);
    assert.equal(log.proteinG, Math.round(1.3 + 20 + 36 + 4 + 40));
    await A.getByText("1,507").first().waitFor();
    assert.equal(await A.getByLabel("Calories (kcal)").count(), 0, "manual totals hidden while the diary is used");
    // Remove the quick add: totals follow
    await A.getByRole("button", { name: "Remove Chicken wrap, meal out" }).click();
    await A.getByText("857").first().waitFor();
    assert.equal((await db.dailyLog.findUnique({ where: { clientId_day: { clientId: profA.id, day } } })).calories, 857);
    // Today screen uses the diary totals
    await A.goto("/app");
    await A.getByText("857").first().waitFor();
    // Recent foods make re-logging one tap
    await A.goto("/app/nutrition/add?meal=LUNCH");
    for (const n of ["Banana", "Greek Style Yogurt", "Chocolate Protein Bar", `Homemade flapjack ${run}`]) await A.getByRole("button", { name: new RegExp(n) }).first().waitFor();
    // When the classic product search is busy, the newer search answers instead
    await A.getByLabel("Search foods").fill("busy day");
    await A.getByRole("button", { name: "Search" }).click();
    await A.getByRole("button", { name: /Busy Day Oat Bar/ }).click();
    await A.getByRole("heading", { name: "Busy Day Oat Bar" }).waitFor();
    await A.getByText("Oatco").waitFor();
    await A.getByRole("button", { name: "Add to lunch" }).click();
    await A.waitForURL(/added=1/);
    assert.equal((await db.dailyLog.findUnique({ where: { clientId_day: { clientId: profA.id, day } } })).calories, 857 + 180);
  });

  await step("Barcode scanning with the phone camera reads a real barcode", async () => {
    const video = path.join(require("node:os").tmpdir(), `abz-barcode-${run}.y4m`);
    execFileSync("python3", [path.resolve("tests/e2e/make-barcode-video.py"), "5000000000012", video]);
    const camBrowser = await chromium.launch({
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${video}`],
    });
    try {
      const ctx = await camBrowser.newContext({ ...devices["iPhone 13"], baseURL: base, permissions: ["camera"] });
      const p = await ctx.newPage();
      await login(p, clients.A.email, clients.A.password);
      await p.goto("/app/nutrition/add?meal=BREAKFAST");
      await p.getByRole("tab", { name: "Scan" }).click();
      await p.getByRole("heading", { name: "Greek Style Yogurt" }).waitFor({ timeout: 20000 });
    } finally {
      await camBrowser.close();
      fs.rmSync(video, { force: true });
    }
  });

  await step("Client A submits a check-in", async () => {
    await A.goto("/app");
    await A.getByRole("link", { name: "Submit Check-in" }).first().click();
    await A.getByLabel("Body weight (kg)").fill("84.1");
    for (const n of ["sleepQuality", "energy", "trainingRating", "nutritionRating"]) await A.locator(`label:has(input[name=${n}][value="4"])`).click();
    await A.getByLabel("Wins this period").fill(`Hit every session ${run}`);
    await A.getByLabel("Struggles").fill("Weekend snacking");
    await A.getByRole("button", { name: "Submit Check-in" }).click();
    await A.waitForURL(/sent=1/);
    assert.ok(await A.getByText("Awaiting reply").first().isVisible());
    const note = mailsTo(COACH_EMAIL).at(-1);
    assert.ok(note && note.subject === `New check-in from ${clients.A.name}`, "coach emailed about the check-in");
    assert.ok(!note.text.includes(`Hit every session ${run}`) && !note.text.includes("84.1"), "no health details in the email");
  });

  await step("Coach sees it needs a reply, opens progress + check-in side by side, replies", async () => {
    await coach.goto("/coach");
    const row = coach.getByRole("link", { name: new RegExp(clients.A.name) });
    assert.ok(await row.getByText("Needs reply").isVisible());
    await row.click();
    await coach.getByText("This week so far").waitFor();
    await coach.getByText(`Hit every session ${run}`).waitFor();
    await coach.goto(coach.url().split("?")[0] + "?view=logs");
    await coach.getByRole("heading", { name: "Food diary" }).waitFor();
    await coach.getByText(`Homemade flapjack ${run}`).waitFor();
    await coach.goBack();
    await coach.getByLabel("Reply").fill("Great week. Keep it up.");
    await coach.getByRole("button", { name: "Send reply" }).click();
    await coach.getByText("Reply sent").waitFor();
    await A.goto("/app/check-ins");
    await A.getByText("Coach replied").first().click();
    await A.getByText("Great week. Keep it up.").waitFor();
    const note = mailsTo(clients.A.email).at(-1);
    assert.ok(note && note.subject === "ABZ replied to your check-in", "client emailed about the reply");
    assert.ok(!note.text.includes("Great week"), "reply text isn't in the email");
  });

  await step("Visitor applies on the site; coach reviews, accepts and invites; they sign up with their application attached", async () => {
    const C = { name: `Charlie Lead ${run}`, email: `charlie.${run}@test.coachedbyabz.com`, password: "charlie-password-123", instagram: "charlie lifts!", about: `Want to add size before summer ${run}`, injuries: "Old knee injury, fine now" };
    clients.C = C;
    const v = await (await phone()).newPage();
    await v.goto("/");
    await v.getByRole("link", { name: "Apply for Online Coaching" }).first().click();
    await v.waitForURL(/\/apply$/);
    assert.equal(await v.getByText("Health check").count(), 0, "no health questions on the form");
    await fillApplication(v, C);
    await v.getByRole("button", { name: "Send application" }).click();
    await v.getByText("Check your Instagram username.").waitFor();
    assert.equal(await v.getByLabel("Your name").inputValue(), C.name, "answers kept after an error");
    assert.equal(await v.getByLabel("Phone or WhatsApp (optional)").count(), 0, "no phone/WhatsApp field");
    await v.getByLabel("Instagram (optional)").fill("https://www.instagram.com/Charlie_Lifts/?hl=en");
    await v.getByRole("button", { name: "Send application" }).click();
    await v.getByRole("heading", { name: "Thanks for applying" }).waitFor();
    const lead = await db.lead.findFirst({ where: { email: C.email } });
    assert.ok(lead && lead.status === "NEW" && lead.injuries === C.injuries && lead.instagram === "charlie_lifts" && Object.keys(lead.health).length === 0 && lead.consentAt, "application stored");
    leadId = lead.id;
    const note = mailsTo(COACH_EMAIL).at(-1);
    assert.equal(note.subject, `New application from ${C.name}`);
    assert.ok(!note.text.includes("knee") && !note.text.includes("summer"), "no answers in the email");
    // A spam bot fills in the hidden field: it looks sent, but nothing is stored.
    const spamEmail = `spam.${run}@test.coachedbyabz.com`;
    await v.goto("/apply");
    await fillApplication(v, { name: "Spam Bot", email: spamEmail });
    await v.locator('input[name="company"]').evaluate((el) => (el.value = "Buy now Ltd"));
    await v.getByRole("button", { name: "Send application" }).click();
    await v.getByRole("heading", { name: "Thanks for applying" }).waitFor();
    assert.equal(await db.lead.count({ where: { email: spamEmail } }), 0, "spam not stored");
    await v.context().close();

    // Coach reviews it
    await coach.goto("/coach");
    await coach.getByRole("link", { name: /new application/ }).click();
    await coach.waitForURL(/\/coach\/leads/);
    await coach.getByRole("link", { name: new RegExp(C.name) }).click();
    await coach.getByText("Old knee injury, fine now").waitFor();
    assert.equal(await coach.getByText("Health check").count(), 0, "no health section for new applications");
    assert.equal(await coach.getByRole("link", { name: "Instagram", exact: true }).getAttribute("href"), "https://www.instagram.com/charlie_lifts/");
    assert.equal(await coach.getByRole("link", { name: "WhatsApp" }).count(), 0, "no WhatsApp button");
    await coach.getByRole("button", { name: "Contacted", exact: true }).click();
    await coach.getByRole("button", { name: "Contacted", exact: true, pressed: true }).waitFor();
    assert.equal((await db.lead.findUnique({ where: { id: leadId } })).status, "CONTACTED");
    await coach.getByLabel("Notes").fill("Called, starting Monday");
    await coach.getByRole("button", { name: "Save notes" }).click();
    await coach.getByText("Notes saved.").waitFor();
    await coach.getByRole("button", { name: /^Accept Charlie/ }).click();
    await coach.getByText(`Accepted. Invite emailed to ${C.email}`).waitFor();
    const link = await coach.getByLabel("Link").inputValue();
    const invite = mailsTo(C.email).at(-1);
    assert.ok(invite && linkIn(invite) === link, "invite emailed to the applicant");
    assert.equal((await db.lead.findUnique({ where: { id: leadId } })).status, "ACCEPTED");

    // They sign up from the invite
    const p = await (await phone()).newPage();
    await p.goto(link.replace(/^https?:\/\/[^/]+/, base));
    await p.getByLabel("Password", { exact: true }).fill(C.password);
    await p.getByLabel("Confirm password").fill(C.password);
    await p.locator('input[name="terms"]').check();
    await p.locator('input[name="consent"]').check();
    await p.getByRole("button", { name: "Create my account" }).click();
    await p.waitForURL(/\/app/);
    const prof = await db.clientProfile.findFirst({ where: { user: { email: C.email } }, include: { lead: true } });
    assert.equal(prof.goal, "MUSCLE_GAIN", "goal taken from the application");
    assert.equal(prof.lead?.id, leadId, "application linked to the client");
    clients.C.page = p;
    clients.C.profileId = prof.id;

    // Coach sees the application on their profile, and it's in their data download
    await coach.goto(`/coach/clients/${prof.id}?view=profile`);
    await coach.getByText("Their application").click();
    await coach.getByText(C.about).waitFor();
    const exp = await unzip(await coach.request.get(`/api/export/client/${prof.id}`));
    assert.equal(exp.json.application.injuries, C.injuries);

    // Deleting a spam application that got through
    const spam = await db.lead.create({
      data: { coachId: lead.coachId, name: "Junk", email: `junk.${run}@test.coachedbyabz.com`, goal: "fat", experience: "beginner", daysPerWeek: 3, trainsAt: "gym", about: "junk junk junk", health: {}, consentAt: new Date() },
    });
    await coach.goto(`/coach/leads/${spam.id}`);
    await coach.getByText("Delete application").click();
    await coach.getByRole("button", { name: "Delete permanently" }).click();
    await coach.waitForURL(/deleted=1/);
    assert.equal(await db.lead.count({ where: { id: spam.id } }), 0);
  });

  await step("Isolation: client B cannot see or touch client A's records or photos", async () => {
    const photo = await db.progressPhoto.findFirst({ where: { clientId: profA.id } });
    const ci = await db.checkIn.findFirst({ where: { clientId: profA.id } });
    assert.equal((await B.request.get(`/api/photos/${photo.id}`)).status(), 404, "photo hidden from B");
    const anon = await browser.newContext({ baseURL: base });
    assert.equal((await anon.request.get(`/api/photos/${photo.id}`)).status(), 404, "photo hidden from logged-out");
    await anon.close();
    for (const url of [`/app/check-ins/${ci.id}`, `/app/training/log/${clients.A.planWorkoutId}`]) {
      const r = await B.goto(url);
      assert.equal(r.status(), 404, url);
    }
    await B.goto("/coach");
    assert.match(B.url(), /\/app$/, "client bounced from coach area");
    const r = await B.goto(`/coach/clients/${profA.id}`);
    assert.ok(!/coach\/clients/.test(B.url()) || r.status() === 404);
    for (const path of ["/app", "/app/progress", "/app/progress?tab=photos", "/app/progress?tab=lifts", "/app/check-ins", "/app/nutrition", "/app/training"]) {
      await B.goto(path);
      const html = await B.content();
      assert.ok(!html.includes(photo.id), `A's photo id not in ${path}`);
      assert.ok(!html.includes(`Hit every session ${run}`), `A's check-in not in ${path}`);
      assert.ok(!html.includes("10,432") && !html.includes("Walk after dinner") && !html.includes("Test block"), `A's data not in ${path}`);
    }
    // A's own foods are private to A.
    const flapjack = await db.food.findFirst({ where: { ownerClientId: profA.id, source: "CUSTOM" } });
    const bSearch = await (await B.request.get(`/api/food/search?q=${encodeURIComponent("flapjack")}`)).json();
    assert.ok(!bSearch.hits.some((h) => h.ref === `d:${flapjack.id}`), "A's food not in B's search");
    const bScan = await B.request.get("/api/food/barcode/5012345678900");
    assert.equal(bScan.status(), 404, "A's barcode food not found for B");
    // Even a tampered form can't log A's food for B.
    await B.goto("/app/nutrition/add?meal=LUNCH");
    await B.getByLabel("Search foods").fill("banana");
    await B.getByRole("button", { name: "Search" }).click();
    await B.getByRole("button", { name: /^Banana/ }).click();
    await B.locator('input[name="ref"]').evaluate((el, ref) => (el.value = ref), `d:${flapjack.id}`);
    await B.getByRole("button", { name: /^Add to/ }).click();
    await B.getByText("That food couldn't be found").waitFor();
    assert.equal(await db.foodEntry.count({ where: { clientId: profB.id } }), 0, "nothing logged for B");
    const anonFood = await browser.newContext({ baseURL: base });
    assert.equal((await anonFood.request.get("/api/food/search?q=banana")).status(), 404, "food search needs a login");
    await anonFood.close();
    // And B's own data stays B's.
    await B.goto("/app/nutrition");
    await B.getByLabel("Steps").fill("777");
    await B.getByRole("button", { name: /^Save today/ }).click();
    await B.getByText("Log saved").waitFor();
    const aLog = await db.dailyLog.findMany({ where: { clientId: profA.id } });
    assert.ok(aLog.every((l) => l.steps !== 777), "B's write didn't land on A");
    assert.equal((await db.dailyLog.findFirst({ where: { clientId: profB.id } })).steps, 777);
  });

  await step("Isolation: another coach cannot open these clients", async () => {
    const bcrypt = require(path.resolve("node_modules/bcryptjs"));
    const email = `othercoach.${run}@test.coachedbyabz.com`;
    await db.user.create({ data: { email, name: "Other Coach", role: "COACH", passwordHash: await bcrypt.hash("other-coach-pass-1", 10) } });
    const ctx = await phone();
    const p = await ctx.newPage();
    await login(p, email, "other-coach-pass-1");
    assert.ok(!(await p.content()).includes(clients.A.name), "not in other coach's roster");
    assert.equal((await p.goto(`/coach/clients/${profA.id}`)).status(), 404);
    assert.equal((await p.goto(`/coach/leads/${leadId}`)).status(), 404, "another coach can't open the application");
    assert.ok(!(await (await p.goto("/coach/leads")).text()).includes(clients.C.name), "not in another coach's leads");
    const photo = await db.progressPhoto.findFirst({ where: { clientId: profA.id } });
    assert.equal((await p.request.get(`/api/photos/${photo.id}`)).status(), 404);
    assert.equal((await coach.request.get(`/api/photos/${photo.id}`)).status(), 200, "own coach can see photo");
    await ctx.close();
  });

  await step("Client B changes their password on the Account page; other devices are logged out", async () => {
    const other = await (await phone()).newPage();
    await login(other, clients.B.email, clients.B.password);
    await B.goto("/app");
    await B.getByRole("link", { name: "Account" }).click();
    await B.getByLabel("Current password").fill("not-my-password");
    await B.getByLabel("New password", { exact: true }).fill("bravo-new-password-456");
    await B.getByLabel("Confirm new password").fill("bravo-new-password-456");
    await B.getByRole("button", { name: "Change password" }).click();
    await B.getByText("Your current password isn't right.").waitFor();
    await B.getByLabel("Current password").fill(clients.B.password);
    await B.getByRole("button", { name: "Change password" }).click();
    await B.getByText("Password changed.").waitFor();
    clients.B.password = "bravo-new-password-456";
    await other.goto("/app");
    assert.match(other.url(), /\/login/, "other device logged out");
    await login(other, clients.B.email, clients.B.password);
    assert.match(other.url(), /\/app/, "new password works");
    await B.goto("/app");
    assert.match(B.url(), /\/app$/, "this device stays logged in");
    await other.context().close();
  });

  await step("Clients download their own data; the coach can download a client's; nobody else can", async () => {
    const b = await unzip(await B.request.get("/api/export/me"));
    assert.equal(b.json.account.email, clients.B.email);
    assert.ok(b.text("daily-log.csv").includes(",777"), "B's steps in the spreadsheet");
    assert.ok(!JSON.stringify(b.json).includes(clients.A.email), "nothing of A's in B's export");
    const a = await unzip(await A.request.get("/api/export/me"));
    assert.ok(a.json.checkIns.some((c) => c.wins.includes(run)), "A's check-in included");
    assert.ok(a.json.checkIns[0].replies.some((r) => r.message.includes("Great week")), "coach reply included");
    const photoFile = Object.keys(a.files).find((f) => f.startsWith("photos/"));
    assert.ok(photoFile && a.files[photoFile].length > 0, "progress photo included");
    assert.ok(a.text("workouts.csv").includes("Bench Press"), "workouts spreadsheet");
    assert.ok(a.text("food-diary.csv").includes("Banana") && a.json.myFoods.some((f) => f.name.startsWith("Homemade flapjack")), "food diary and own foods included");
    for (const pg of [B, A]) assert.equal((await pg.request.get(`/api/export/client/${profA.id}`)).status(), 404, "clients can't use the coach export");
    const anon = await browser.newContext({ baseURL: base });
    assert.equal((await anon.request.get("/api/export/me")).status(), 404);
    assert.equal((await anon.request.get(`/api/export/client/${profA.id}`)).status(), 404);
    await anon.close();
    const c = await unzip(await coach.request.get(`/api/export/client/${profA.id}`));
    assert.equal(c.json.account.email, clients.A.email);
  });

  await step("Forgot password emails a working reset link, without revealing who has an account", async () => {
    const p = await (await phone()).newPage();
    await p.goto("/login");
    await p.getByRole("link", { name: "Forgot your password?" }).click();
    await p.waitForURL(/\/forgot/);
    await p.getByLabel("Email").fill(`nobody.${run}@test.coachedbyabz.com`);
    await p.getByRole("button", { name: "Send reset link" }).click();
    await p.getByText("If nobody.").waitFor();
    assert.equal(mailsTo(`nobody.${run}@test.coachedbyabz.com`).length, 0, "no email for unknown address");
    await p.goto("/forgot");
    await p.getByLabel("Email").fill(clients.A.email);
    await p.getByRole("button", { name: "Send reset link" }).click();
    await p.getByText(`If ${clients.A.email} has an account`).waitFor();
    const mail = mailsTo(clients.A.email).at(-1);
    assert.equal(mail.subject, "Reset your Coached by ABZ password");
    await p.goto(linkIn(mail).replace(/^https?:\/\/[^/]+/, base));
    await p.getByLabel("New password", { exact: true }).fill("alpha-reset-password-789");
    await p.getByLabel("Confirm password").fill("alpha-reset-password-789");
    await p.getByRole("button", { name: "Save password" }).click();
    await p.waitForURL(/\/app/);
    clients.A.password = "alpha-reset-password-789";
    await A.goto("/app");
    assert.match(A.url(), /\/login/, "old sessions ended after reset");
    clients.A.page2 = p;
  });

  await step("Check-in reminder is emailed the day before it's due, only once", async () => {
    const tz = "Europe/London";
    const T = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
    const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    const tomorrowWd = new Date(addDays(T, 1) + "T00:00:00Z").getUTCDay();
    await db.user.update({ where: { email: clients.B.email }, data: { timezone: tz } });
    await db.clientProfile.update({ where: { id: profB.id }, data: { checkInFrequency: "WEEKLY", checkInWeekday: tomorrowWd, startDay: addDays(T, -30), lastReminderDueDay: null } });
    // Last week's check-in was done, so the next one is due tomorrow.
    await db.checkIn.create({ data: { clientId: profB.id, type: "WEEKLY", day: addDays(T, -6), sleepQuality: 3, energy: 3, trainingRating: 3, nutritionRating: 3 } });
    // Applications that never became clients are deleted after 12 months; others are kept.
    const coachId = (await db.user.findUnique({ where: { email: COACH_EMAIL } })).id;
    const leadBase = { coachId, goal: "fat", experience: "beginner", daysPerWeek: 3, trainsAt: "gym", about: "x".repeat(12), health: {}, consentAt: new Date() };
    const old = await db.lead.create({ data: { ...leadBase, name: "Old", email: `old.${run}@test.coachedbyabz.com`, createdAt: new Date(Date.now() - 400 * 86400000) } });
    const recent = await db.lead.create({ data: { ...leadBase, name: "Recent", email: `recent.${run}@test.coachedbyabz.com`, createdAt: new Date(Date.now() - 300 * 86400000) } });
    await db.lead.update({ where: { id: leadId }, data: { createdAt: new Date(Date.now() - 400 * 86400000) } });
    const runReminders = () =>
      execFileSync("npx", ["tsx", "scripts/run-reminders.ts"], { env: { ...process.env, APP_URL: base, REMINDER_NOW: `${T}T12:00:00Z` }, encoding: "utf8" });
    runReminders();
    let reminders = mailsTo(clients.B.email).filter((m) => m.subject === "Your check-in is due tomorrow");
    assert.equal(reminders.length, 1, "one reminder sent");
    assert.ok(linkIn(reminders[0]).endsWith("/app/check-ins/new"));
    runReminders();
    reminders = mailsTo(clients.B.email).filter((m) => m.subject === "Your check-in is due tomorrow");
    assert.equal(reminders.length, 1, "not sent twice");
    assert.equal(await db.lead.count({ where: { id: old.id } }), 0, "year-old application deleted");
    assert.equal(await db.lead.count({ where: { id: recent.id } }), 1, "recent application kept");
    assert.equal(await db.lead.count({ where: { id: leadId } }), 1, "application of a client kept");
  });

  await step("Coach deletes client A permanently: records, photos and logins all gone", async () => {
    const photo = await db.progressPhoto.findFirst({ where: { clientId: profA.id } });
    const photoPath = path.join(storageRoot, photo.storageKey);
    assert.ok(fs.existsSync(photoPath), "photo stored before delete");
    await coach.goto(`/coach/clients/${profA.id}?view=profile`);
    await coach.getByLabel("Type DELETE to confirm").fill("delete");
    await coach.getByRole("button", { name: `Delete ${clients.A.name} permanently` }).click();
    await coach.getByText("Type DELETE in capitals to confirm.").waitFor();
    assert.ok(await db.clientProfile.findUnique({ where: { id: profA.id } }), "nothing deleted without confirmation");
    await coach.getByLabel("Type DELETE to confirm").fill("DELETE");
    await coach.getByRole("button", { name: `Delete ${clients.A.name} permanently` }).click();
    await coach.waitForURL(/\/coach\?deleted=/);
    await coach.getByText(`${clients.A.name} and all their data have been permanently deleted.`).waitFor();
    assert.equal(await db.user.findUnique({ where: { email: clients.A.email } }), null, "account gone");
    assert.equal(await db.clientProfile.findUnique({ where: { id: profA.id } }), null, "profile gone");
    assert.equal(await db.checkIn.count({ where: { clientId: profA.id } }), 0, "check-ins gone");
    assert.equal(await db.progressPhoto.count({ where: { clientId: profA.id } }), 0, "photo records gone");
    assert.equal(await db.foodEntry.count({ where: { clientId: profA.id } }), 0, "food diary gone");
    assert.equal(await db.food.count({ where: { ownerClientId: profA.id } }), 0, "their own foods gone");
    assert.ok(!fs.existsSync(photoPath), "photo file removed from storage");
    await clients.A.page2.goto("/app");
    assert.match(clients.A.page2.url(), /\/login/, "their login no longer works");
    assert.equal((await coach.request.get(`/api/export/client/${profA.id}`)).status(), 404);
    assert.equal((await coach.request.get(`/api/photos/${photo.id}`)).status(), 404);
  });
} finally {
  // Clean up test accounts so runs don't pile up.
  const emails = { contains: `${run}@test.coachedbyabz.com` };
  const photos = await db.progressPhoto.findMany({ where: { client: { user: { email: emails } } } });
  for (const ph of photos) fs.rmSync(path.join(storageRoot, ph.storageKey), { force: true });
  await db.lead.deleteMany({ where: { email: emails } });
  await db.user.deleteMany({ where: { email: emails, role: "CLIENT" } });
  await db.user.deleteMany({ where: { email: emails } });
  await db.$disconnect();
  await browser.close();
  const failed = results.filter((r) => r[0] === "FAIL").length;
  console.log(`\n${results.length - failed}/${results.length} journeys passed`);
  process.exitCode = failed ? 1 : process.exitCode;
}
