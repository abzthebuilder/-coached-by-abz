import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { CheckInForm } from "@/components/checkin-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Submit check-in" };

export default async function NewCheckIn() {
  const { profile } = await requireClient();
  return (
    <div>
      <Link href="/app/check-ins" className="text-sm text-mute">← Check-ins</Link>
      <PageHeader eyebrow={profile.checkInFrequency === "WEEKLY" ? "Weekly check-in" : "Monthly check-in"} title="How did it go?">
        Be honest. The more detail you give, the better I can help.
      </PageHeader>
      <CheckInForm />
    </div>
  );
}
