import { requireClient } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { ProgressDashboard, asTab } from "@/components/progress/dashboard";
import { MeasurementForm, PhotoUploadForm } from "@/components/progress/forms";
import { deletePhotoAction } from "@/app/actions/client";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Progress" };

export default async function Progress({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { user, profile } = await requireClient();
  const today = todayIn(user.timezone);
  const tab = asTab((await searchParams).tab);
  return (
    <div>
      <PageHeader eyebrow="Your results" title="Progress" />
      <ProgressDashboard
        clientId={profile.id}
        today={today}
        goal={profile.goal}
        tab={tab}
        hrefFor={(t) => `/app/progress?tab=${t}`}
        measurementForm={<MeasurementForm today={today} />}
        photoForm={<PhotoUploadForm today={today} />}
        photoDelete={deletePhotoAction}
      />
    </div>
  );
}
