# Coached by ABZ

The public website and private coaching portal for Coached by ABZ.

- **Public site** (`/`, `/coaching`, `/about`, `/get-started`): services, coaching story, what to expect and how to get started. It has three buttons: Apply for Online Coaching (Tally), Book a PT Consultation (Calendly) and Client Login. There's no pricing on the site.
- **Client portal** (`/app`): Today, Training, Nutrition & steps, Progress and Check-ins, with bottom navigation on phones.
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

Then log in at `/login` as the coach, go to **Settings** and paste your real **Tally** and **Calendly** links. They're stored in the database and go live straight away. `TALLY_URL` / `CALENDLY_URL` in `.env` are only used as fallbacks.

### Your gym photos

Drop your own photos into `public/images/` using these file names (JPG):

| File | Where it shows |
| --- | --- |
| `hero.jpg` | Home page hero (portrait works best) |
| `about.jpg` | Coaching story (home + About) |
| `online.jpg` | Online Coaching card |
| `pt.jpg` | 1:1 Personal Training card |
| `gym-1.jpg`, `gym-2.jpg`, `gym-3.jpg` | Square photo strip on the home page |

If a photo is missing, the site shows a branded black-and-gold panel in its place. All public wording is in `src/content/site.ts`, so you can make the story and copy your own.

### Photo storage

Progress photos are never in `/public`. They're served only through `/api/photos/:id`, which checks that the viewer is that client or their coach. Anyone else gets a 404.

- `STORAGE_DRIVER=local`: files go in `STORAGE_DIR`. Use a persistent disk or volume.
- `STORAGE_DRIVER=s3`: uses any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze). Keep the bucket **private**.

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
BASE_URL=http://localhost:3000 NODE_PATH=$(npm root -g) npm run test:e2e
```

The end-to-end suite runs on an emulated iPhone 13. It runs the coach and client journeys (invite → accept → plan from template → macro calculator → log steps → log workout → last-time hints → daily totals → chart tap → photo upload → check-in → coach reply) and checks isolation: a second client and a second coach both get 404s for the first client's photos, check-ins and workouts, and none of the first client's data shows up on their pages.

Demo logins after `npm run db:seed`: `coach@demo.coachedbyabz.com` / `coach-demo-pass-1`, `alex@demo.coachedbyabz.com` / `alex-demo-pass-1`, `sam@demo.coachedbyabz.com` / `sam-demo-pass-1`. Don't seed production.
