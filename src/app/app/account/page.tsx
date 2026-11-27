import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { PRIVACY_CONTACT } from "@/content/privacy";
import { ChangePasswordForm } from "@/components/change-password";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { logoutAction } from "@/app/actions/auth";
import { NotificationsCard } from "@/components/notifications-card";
import { vapidPublicKey } from "@/lib/push";
import { db } from "@/lib/db";

export const metadata = { title: "Account" };

export default async function Account() {
  const { user } = await requireClient();
  const [publicKey, member] = await Promise.all([vapidPublicKey(), db.communityMember.findUnique({ where: { userId: user.id } })]);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Your details" title="Account">
        <span className="text-bone">{user.name}</span> · {user.email}
      </PageHeader>

      <Card>
        <CardTitle eyebrow="This phone" title="Notifications" />
        <p className="mb-3 text-sm text-mute">Get a notification when ABZ replies to your check-in, and for community messages if you&apos;ve joined.</p>
        <NotificationsCard publicKey={publicKey} communityNotify={member && !member.removedAt ? (member.notify as "all" | "coach" | "off") : null} />
      </Card>

      <Card>
        <CardTitle title="Change password" />
        <ChangePasswordForm minLength={10} />
      </Card>

      <Card>
        <CardTitle eyebrow="Your data" title="Download a copy" />
        <p className="mb-4 text-sm text-mute">
          Get everything stored about you in one file: your logs, workouts, check-ins, measurements and progress photos. The
          spreadsheets open in Excel, Numbers or Google Sheets.
        </p>
        <a
          href="/api/export/me"
          className="flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-char-2 px-5 font-semibold hover:border-gold/60"
        >
          Download my data (.zip)
        </a>
      </Card>

      <Card>
        <CardTitle eyebrow="Privacy" title="Your information" />
        <ul className="space-y-3 text-sm">
          <li>
            <Link href="/privacy" className="text-gold underline underline-offset-4">
              Privacy policy
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-gold underline underline-offset-4">
              Terms and health disclaimer
            </Link>
          </li>
          <li className="text-mute">
            Want your account and data deleted? Email{" "}
            <a
              href={`mailto:${PRIVACY_CONTACT}?subject=${encodeURIComponent("Please delete my Coached by ABZ account")}`}
              className="text-gold underline underline-offset-4"
            >
              {PRIVACY_CONTACT}
            </a>
            .
          </li>
        </ul>
      </Card>

      <form action={logoutAction}>
        <button className="min-h-12 w-full rounded-xl border border-line text-sm text-mute">Log out</button>
      </form>
    </div>
  );
}
