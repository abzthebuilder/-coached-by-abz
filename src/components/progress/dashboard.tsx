import Link from "next/link";
import { db } from "@/lib/db";
import { activePlan, liftHistory, loadDayPoints } from "@/lib/progress";
import { weekSummary } from "@/lib/metrics";
import { WeekSummary } from "./week-summary";
import { TrendChart } from "./trend-chart";
import { Lifts } from "./lifts";
import { MeasurementCompare, PhotoCompare } from "./compare";
import { Card, cx } from "@/components/ui";
import type { ReactNode } from "react";

export const PROGRESS_TABS = ["trends", "measurements", "photos", "lifts"] as const;
export type ProgressTab = (typeof PROGRESS_TABS)[number];

export function asTab(v: string | string[] | undefined): ProgressTab {
  return PROGRESS_TABS.includes(v as ProgressTab) ? (v as ProgressTab) : "trends";
}

/**
 * Progress for one client. Callers must have already checked access
 * (requireClient for the client's own page, requireCoachedClient for the coach).
 */
export async function ProgressDashboard({
  clientId,
  today,
  goal,
  tab,
  hrefFor,
  measurementForm,
  photoForm,
  photoDelete,
}: {
  clientId: string;
  today: string;
  goal: "FAT_LOSS" | "MUSCLE_GAIN" | "RECOMP" | "STRENGTH";
  tab: ProgressTab;
  hrefFor: (tab: ProgressTab) => string;
  measurementForm?: ReactNode;
  photoForm?: ReactNode;
  photoDelete?: (fd: FormData) => Promise<void>;
}) {
  const [points, plan] = await Promise.all([loadDayPoints(clientId, today), activePlan(clientId)]);
  const week = weekSummary(points, today, plan?.workoutsPerWeek ?? 0);

  let body: ReactNode = null;
  if (tab === "trends") {
    body = <TrendChart points={points.slice(-90)} />;
  } else if (tab === "lifts") {
    body = <Lifts lifts={await liftHistory(clientId)} />;
  } else if (tab === "measurements") {
    const items = await db.measurement.findMany({ where: { clientId }, orderBy: { day: "asc" } });
    body = (
      <div className="space-y-5">
        <MeasurementCompare items={items} />
        {measurementForm}
      </div>
    );
  } else if (tab === "photos") {
    const photos = await db.progressPhoto.findMany({ where: { clientId }, orderBy: { day: "asc" }, select: { id: true, day: true, pose: true } });
    body = (
      <div className="space-y-5">
        {photoForm}
        <PhotoCompare photos={photos} deleteAction={photoDelete} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WeekSummary w={week} goal={goal} />
      <nav aria-label="Progress sections" className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {PROGRESS_TABS.map((t) => (
          <Link
            key={t}
            href={hrefFor(t)}
            scroll={false}
            aria-current={tab === t ? "page" : undefined}
            className={cx(
              "flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold capitalize",
              tab === t ? "border-gold text-bone" : "border-transparent text-mute",
            )}
          >
            {t}
          </Link>
        ))}
      </nav>
      <Card>{body}</Card>
    </div>
  );
}
