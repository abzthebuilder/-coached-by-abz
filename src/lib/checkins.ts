import "server-only";
import { db } from "./db";
import { checkInStatus } from "./checkin-schedule";
import type { ClientProfile } from "@prisma/client";

export async function statusForProfile(profile: ClientProfile, today: string) {
  const last = await db.checkIn.findFirst({ where: { clientId: profile.id }, orderBy: { createdAt: "desc" } });
  return {
    last,
    status: checkInStatus(
      {
        frequency: profile.checkInFrequency,
        weekday: profile.checkInWeekday,
        monthDay: profile.checkInMonthDay,
        startDay: profile.startDay,
      },
      today,
      last?.day ?? null,
    ),
  };
}
