# Deploying a test copy to Railway (from an iPhone)

Everything below can be done in Safari on an iPhone. Steps marked **💻 Computer** need a computer. None of them are required for a test deployment.

## What's already configured in the repo

- `railway.json`: builds with `npm run build`, runs `npx prisma migrate deploy` before each deploy (so the database tables are created or updated before the new version goes live), starts with `npm start`, and health-checks `/api/health`.
- **Photos**: when a Railway volume is attached, photos are saved automatically to `<volume>/photos`. Without a volume, uploads are refused with a clear message, so photos can't be silently lost on a redeploy.
- **Invite links**: use your Railway domain automatically via `APP_URL`.
- **First coach account**: created through a one-time `/setup` page protected by a `SETUP_TOKEN` you choose. The page disappears for good once a coach exists.

## Branch to deploy

Select **`claude/coached-abz-website-portal-5orr29`**. `main` only contains the initial README, so there's nothing to deploy on it yet.

## Steps

### 1. Create the project
1. Open **railway.com** in Safari and sign in with GitHub.
2. Tap **New Project → Deploy from GitHub repo**. If asked, let Railway's GitHub app access `abzthebuilder/-coached-by-abz`.
3. Pick **-coached-by-abz**. Railway starts building the default branch (`main`) straight away. That build will fail or produce an empty site, which is expected.
4. Tap the new service → **Settings → Source** → set **Branch** to `claude/coached-abz-website-portal-5orr29`. (Do this before adding variables so the next deploy uses the right code.)

### 2. Add PostgreSQL
5. On the project canvas tap **+ Create** (or **New**) → **Database → PostgreSQL**. Wait until it shows as running.

### 3. Add the photo volume
6. Tap **+ Create → Volume**, choose the **app service** (not Postgres), and set the mount path to **`/data`**.
   Railway tells the app where the volume is mounted (`RAILWAY_VOLUME_MOUNT_PATH`), so photos go in `/data/photos` automatically. **Don't set `STORAGE_DIR`.**

### 4. Make a setup token
7. Open the iPhone **Passwords** app → **+** → for the website, type `railway setup`. Tap the password field and accept the **Strong Password** suggestion, then save. Long-press the password and tap **Copy**. This is your `SETUP_TOKEN`. It must be at least 24 characters, and Apple's suggestions are.

### 5. Set the app's variables
8. App service → **Variables** → **Raw Editor** (or add them one by one) and paste:

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
   APP_TIMEZONE=Europe/London
   STORAGE_DRIVER=local
   SETUP_TOKEN=paste-the-token-from-step-7
   ```

   - `${{Postgres.DATABASE_URL}}` is a Railway reference. It links to the database's private connection string, so you never copy the password anywhere. If your database service has a different name, use that name instead of `Postgres`.
   - `APP_TIMEZONE` is only a fallback. Each person's own timezone is taken from their phone when they sign up.
   - Tap **Deploy** / **Apply changes** when Railway asks.

### 6. Get the temporary URL
9. App service → **Settings → Networking → Generate Domain**. If it asks for a port, use the one it suggests (the app listens on the `PORT` Railway gives it, usually 8080). You'll get a URL like `https://coached-by-abz-production.up.railway.app`. `APP_URL` picks it up automatically.
10. Wait for the deployment to turn green (**Deployments** tab; tap it to see logs). The pre-deploy step should print `All migrations have been successfully applied.`
11. Open `https://YOUR-URL/api/health`. You should see `{"ok":true}`.

### 7. Create your coach account securely
12. Open `https://YOUR-URL/setup`.
13. Paste the setup token from the Passwords app. Enter your name and email. In the password field, accept Safari's **Strong Password** suggestion so it's saved to your iCloud Keychain. Tap **Create coach account**.
14. You'll land on **Coach → Settings** already logged in. `/setup` now returns "not found" for everyone, even with the token.
15. Back in Railway: app service → **Variables** → delete **`SETUP_TOKEN`** and apply. Setup is already closed, so this just removes a secret you no longer need.
16. In **Coach → Settings**, paste your real **Tally** and **Calendly** links.

Why this is safe: the token never appears in a URL or a log, it's compared in constant time, wrong attempts are rate-limited, and the account is only created if no coach exists yet. That check happens inside a database transaction, so two people can't race to create it.

### 8. Try it on your phone
17. In **Coach → Clients**, invite yourself under a second email address (for example a Hide My Email address), open the link, and run through Today → Log Steps → Log Workout → Submit Check-in → Progress → upload a progress photo. Then reply to the check-in as coach.

## Backups

You need backups for **both** the database (accounts, logs, check-ins) and the photo volume. They're separate, and each needs its own schedule.

**Plan note:** Railway's documentation and staff answers say scheduled backups are a **Pro plan** feature. If you don't see a **Backups** tab, check your plan under **Workspace → Billing**.

**Database**
1. Tap the **Postgres** service → **Backups** tab.
2. Turn on **Daily** (kept about 6 days) and **Weekly** (kept about 1 month). Add **Monthly** (kept about 3 months) for longer history. You can enable more than one.
3. To restore: same tab → choose a backup → **Restore**, then deploy the staged change.

**Progress photos**
1. Tap the **app service's volume** (`/data`) → **Backups** tab.
2. Enable the **same schedules** as the database, so a restore of both from the same day matches up.
3. Restore works the same way.

**Off-Railway copy (recommended before real clients) 💻 Computer**
Railway's backups live inside Railway. For a copy you control, run `pg_dump` against the database's public connection string from a computer, and download the photos (or move photo storage to a private S3/R2 bucket with its own versioning: set `STORAGE_DRIVER=s3` and the `S3_*` variables). This isn't needed for a test deployment.

## Things that need a computer (all optional)

- **💻 Off-site database dumps** (`pg_dump`), as above.
- **💻 Running the automated test suite** (`npm test`, `npm run test:e2e`) against your deployment.
- **💻 Railway CLI** (`railway run`, `railway ssh`). Not needed, because `/setup` replaces it.
- **Adding your gym photos** to `public/images/` is easiest on a computer. On an iPhone, GitHub in Safari (**Add file → Upload files** on the branch) usually works, or send the photos to Claude to add.

## Notes

- Never run `npm run db:seed` against this database. It creates demo accounts with public passwords.
- With a volume attached, Railway runs one copy of the app and there's a short pause during each redeploy. That's fine for coaching traffic.
- When you're ready to go fully live, merge the branch into `main` and point Railway's **Source → Branch** back to `main`.
