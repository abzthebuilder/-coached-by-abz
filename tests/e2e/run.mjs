// End-to-end check of the coach and client journeys on a phone, plus data isolation
// between two client accounts. Needs a running server (BASE_URL) and the demo seed
// (npm run db:seed) for the coach login and "Upper A" template.
//   BASE_URL=http://localhost:3000 npm run test:e2e
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import path from "node:path";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.env.NODE_PATH || "/opt/node22/lib/node_modules", "playwright")); }
const { chromium, devices } = pw;
const { PrismaClient } = require(path.resolve("node_modules/@prisma/client"));

const base = process.env.BASE_URL || "http://localhost:3000";
const run = Date.now().toString(36);
const db = new PrismaClient();
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
  await step("Public site shows the three buttons", async () => {
    const p = await coachCtx.newPage();
    await p.goto("/");
    for (const n of ["Apply for Online Coaching", "Book a PT Consultation", "Client Login"]) assert.ok(await p.getByRole("link", { name: n }).first().isVisible(), n);
    for (const u of ["/", "/coaching", "/about", "/get-started"]) {
      await p.goto(u);
      const text = await p.locator("body").innerText();
      assert.ok(!/£|€|\$\d|per month|per week|pricing|package/i.test(text), `no pricing on ${u}`);
    }
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
      const ctx = await phone();
      const p = await ctx.newPage();
      await p.goto(link.replace(/^https?:\/\/[^/]+/, base));
      await p.getByLabel("Password", { exact: true }).fill(clients[k].password);
      await p.getByLabel("Confirm password").fill(clients[k].password);
      await p.getByRole("button", { name: "Create my account" }).click();
      await p.waitForURL(/\/app/);
      assert.ok(await p.getByText("You're in.").isVisible());
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
  });

  await step("Coach sees it needs a reply, opens progress + check-in side by side, replies", async () => {
    await coach.goto("/coach");
    const row = coach.getByRole("link", { name: new RegExp(clients.A.name) });
    assert.ok(await row.getByText("Needs reply").isVisible());
    await row.click();
    await coach.getByText("This week so far").waitFor();
    await coach.getByText(`Hit every session ${run}`).waitFor();
    await coach.getByLabel("Reply").fill("Great week. Keep it up.");
    await coach.getByRole("button", { name: "Send reply" }).click();
    await coach.getByText("Reply sent").waitFor();
    await A.goto("/app/check-ins");
    await A.getByText("Coach replied").first().click();
    await A.getByText("Great week. Keep it up.").waitFor();
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
    const photo = await db.progressPhoto.findFirst({ where: { clientId: profA.id } });
    assert.equal((await p.request.get(`/api/photos/${photo.id}`)).status(), 404);
    assert.equal((await coach.request.get(`/api/photos/${photo.id}`)).status(), 200, "own coach can see photo");
    await ctx.close();
  });
} finally {
  // Clean up test accounts so runs don't pile up.
  const emails = { contains: `${run}@test.coachedbyabz.com` };
  const photos = await db.progressPhoto.findMany({ where: { client: { user: { email: emails } } } });
  const fs = require("node:fs");
  for (const ph of photos) fs.rmSync(path.resolve(process.env.STORAGE_DIR || (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "photos") : "storage"), ph.storageKey), { force: true });
  await db.user.deleteMany({ where: { email: emails, role: "CLIENT" } });
  await db.user.deleteMany({ where: { email: emails } });
  await db.$disconnect();
  await browser.close();
  const failed = results.filter((r) => r[0] === "FAIL").length;
  console.log(`\n${results.length - failed}/${results.length} journeys passed`);
  process.exitCode = failed ? 1 : process.exitCode;
}
