# Coached by ABZ

The public website and private coaching portal for Coached by ABZ.

- **Public site** (`/`, `/coaching`, `/about`, `/get-started`): services, coaching story, what to expect and how to get started. It has two buttons: Apply for Online Coaching (Tally) and Client Login. There's no pricing on the site.
- **Client portal** (`/app`): Today, Training, Nutrition & steps, Progress and Check-ins, with bottom navigation on phones, plus an Account page. Clients can add it to their home screen and open it like an app.
- **Coach dashboard** (`/coach`): roster with check-in status, invites, a check-in inbox, workout templates, and each client's progress next to their latest check-in. Also plans, a macro calculator, tasks, logs, photos and settings.

Built with Next.js (App Router), PostgreSQL through Prisma, and email + password logins using server-side sessions. Progress photos go in private storage, either on local disk or in an S3-compatible bucket.

## Setup

**Deploying to Railway?** Follow [docs/DEPLOY-RAILWAY.md](docs/DEPLOY-RAILWAY.md). It works entirely from a phone.

```bash
npm install
cp .env.example .env          # set DATABASE_URL etc.
npx prisma migrate deploy     # create tables
npm run create-coach -- you@example.com "ABZ" 'a-long-password'
npm run build && npm start
```

Then log in at `/login` as the coach, go to **Settings** and paste your real **Tally** link. It's stored in the database and goes live straight away. `TALLY_URL` in `.env` is only used as a fallback.

### Your gym photos

Drop your own photos into `public/images/` using these file names (JPG):

| File | Where it shows |
| --- | --- |
| `hero.jpg` | Home page hero (portrait works best) |
| `about.jpg` | Coaching story (home + About), shown square |
| `online.jpg` | Online Coaching section on the home page |
| `gym.jpg` | Coaching page |
| `banner.jpg` | Wide photo above "How to get started" and on the Get Started page |

If the hero or story photo is missing, the site shows a branded black-and-gold panel in its place; other photo spots are simply hidden. All public wording is in `src/content/site.ts`, so you can make the story and copy your own.

### Photo storage

Progress photos are never in `/public`. They're served only through `/api/photos/:id`, which checks that the viewer is that client or their coach. Anyone else gets a 404.

- `STORAGE_DRIVER=local`: files go in `STORAGE_DIR`. Use a persistent disk or volume.
- `STORAGE_DRIVER=s3`: uses any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze). Keep the bucket **private**.

## Applications (Leads)

The Apply buttons open the site's own form at `/apply` (switchable to a Tally link in Coach → Settings).
It asks about goals, experience, training and injuries, and records two consents (18+ and terms; use of
their answers). There are no health-screening questions: clients accept the health disclaimer at sign-up. Spam is stopped by a hidden honeypot
field and a per-connection limit.

Applications appear under **Leads** (with a badge for new ones). The coach can contact (email / WhatsApp /
call), mark New / Contacted / Declined, keep notes, and **Accept**, which creates the invite (emailed if
email is on). When the applicant signs up, the application is attached to their profile (Profile tab),
their goal is pre-filled, and it's included in their data download and deleted with them. Applications that
never become clients are deleted automatically after 12 months (hourly job; `scripts/run-reminders.ts`).
Wording and questions: `src/content/apply.ts`.

## Community chat

One optional group chat per coach (`/app/community`, `/coach/community`). Clients opt in, choose the
name others see and agree to the rules (`src/content/community.ts`). Text messages, reactions, one
pinned message, unread badges; the chat refreshes every few seconds. Members can delete their own
messages and report others'; the coach can delete any message, pin, review reports and remove or
re-admit members. Leaving deletes the member's messages. Only members (and the coach) can read it.

## Food diary

Clients log food by meal on **Nutrition**: search, scan a barcode with the phone camera, create a food
from a label, or quick-add calories. The day's calories and macros are worked out from the diary
(on the server, from stored food data), so Today, charts and adherence use them automatically.
Clients who use another app can still type daily totals instead. The coach sees the diary on a
client's **Logs** tab.

- Common foods: `src/content/foods.ts` (typical UK values per 100 g).
- Products: [Open Food Facts](https://world.openfoodfacts.org) (free, ODbL; attribution shown in the app).
  Only the search words or barcode are sent. Products are saved once looked up by barcode.
- Barcode reading runs on the phone; the reader (`zxing-wasm`) is copied to `/public/vendor` at build time
  and served from this site.
- Optional env: `OFF_BASE_URL`, `OFF_SEARCH_URL` (used by tests to point at `tests/e2e/off-stub.mjs`).

## Emails (optional)

Out of the box the app sends no email: you copy invite and reset links by hand. Once you have your own
domain, create a [Resend](https://resend.com) account, verify the domain there, and set `RESEND_API_KEY`,
`EMAIL_FROM` (e.g. `Coached by ABZ <coach@yourdomain.com>`) and optionally `EMAIL_REPLY_TO`. Then:

- invites and password reset links are emailed automatically, and the login page's **Forgot password** works
- clients get an email when you reply to their check-in; you get one when a client checks in or replies
- clients get a reminder the day before a check-in is due (9am their time, once per check-in)

Emails never include health information, only a short note and a link to log in.

## Client data rights

- Clients can download a copy of all their information from **Account** in the app.
- On a client's **Profile** tab, the coach can **Download their data** or **Delete client permanently**
  (type DELETE to confirm; removes their account, records and progress photos).
- Sign-up requires two separate tick boxes: terms/health disclaimer (and 18+), and health data consent.
  The dates are stored and shown on the client's Profile tab.

## How access is enforced

- Client actions never accept a client id. The client is always taken from the session (`requireClient`), so a client can only read or write their own records.
- Coach pages and actions look up clients with `coachId = the logged-in coach` (`requireCoachedClient`). A client who isn't yours returns 404.
- Invite and reset links are random, stored only as SHA-256 hashes, single-use and time-limited.
- Passwords are hashed with bcrypt. Session cookies are httpOnly, SameSite=Lax and Secure in production. Logins are rate-limited.

## Flows

1. **Invite**: Coach → Clients → Invite creates a single-use link (14 days) that you copy or text to the client. The client opens it and sets a password. Their timezone is saved so "today" matches their own day.
2. **Plan**: build workouts in Templates, then on a client's **Plan** tab create a plan and add workouts. Each client gets their own copy to tweak.
3. **Targets**: on the client's **Nutrition** tab, enter calories, protein and fat. Carbs are calculated (and recalculated on the server). Review the change, then save it with a start date. Target history is kept, so older chart days are measured against the targets in force at the time.
4. **Logging**: clients log workouts (with what they lifted last time shown), daily calories and macros, steps, weight, measurements and photos. Days with nothing logged stay blank on charts. They aren't treated as zero.
5. **Check-ins**: weekly (choose the weekday) or monthly (choose the day of the month). Clients can submit up to 2 days early (weekly) or 5 days early (monthly). The coach replies in a thread.

## Tests

```bash
npm test                         # unit tests: macro maths, check-in schedule, week comparison, adherence
npm run db:seed                  # demo coach + 2 demo clients (dev only)
# e2e expects: node tests/e2e/off-stub.mjs 4010, and the server started with
# OFF_BASE_URL=http://localhost:4010 OFF_SEARCH_URL=http://localhost:4010 EMAIL_DEV_LOG=<file> DISABLE_REMINDERS=1
BASE_URL=http://localhost:3000 NODE_PATH=$(npm root -g) npm run test:e2e
```

The end-to-end suite runs on an emulated iPhone 13. It runs the coach and client journeys (invite → accept → plan from template → macro calculator → log steps → log workout → last-time hints → daily totals → chart tap → photo upload → check-in → coach reply) and checks isolation: a second client and a second coach both get 404s for the first client's photos, check-ins and workouts, and none of the first client's data shows up on their pages. It also covers the consent tick boxes (enforced on the server), every email (invite, reply, check-in, reset, reminder, and that none contain health details), forgot password, changing password, data downloads (and that nobody else can download them), the once-only check-in reminder, and permanently deleting a client including their photo files.

Demo logins after `npm run db:seed`: `coach@demo.coachedbyabz.com` / `coach-demo-pass-1`, `alex@demo.coachedbyabz.com` / `alex-demo-pass-1`, `sam@demo.coachedbyabz.com` / `sam-demo-pass-1`. Don't seed production.
