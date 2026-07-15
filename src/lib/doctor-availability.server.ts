import "server-only";

import { prisma } from "@/lib/db/prisma";
import { dayOfWeekAr } from "@/lib/days-ar";
import {
  normalizeShift,
  type DoctorAvailability,
  type WeekDay,
  type WorkWindow,
} from "@/lib/doctor-availability";

export async function loadDoctorAvailability(
  doctorId: string,
): Promise<DoctorAvailability | null> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { fullName: true } },
      workingHours: { where: { isActive: true } },
    },
  });
  if (!doctor) return null;

  const workDays = [
    ...new Set(doctor.workingHours.map((h) => h.dayOfWeek)),
  ] as WeekDay[];

  const windowsByDay: DoctorAvailability["windowsByDay"] = {};
  for (const wh of doctor.workingHours) {
    if (!windowsByDay[wh.dayOfWeek]) windowsByDay[wh.dayOfWeek] = [];
    const win: WorkWindow = {
      start: wh.startTime,
      end: wh.endTime,
      shift: normalizeShift(wh.shift),
    };
    windowsByDay[wh.dayOfWeek]!.push(win);
  }

  return {
    doctorId: doctor.id,
    doctorName: doctor.user.fullName,
    workDays,
    workDaysAr: workDays.map((d) => dayOfWeekAr[d] || d),
    windowsByDay,
  };
}
