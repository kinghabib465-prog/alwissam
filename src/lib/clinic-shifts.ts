/** فترات العمل الافتراضية للعيادة — صباحي ومسائي */
export const CLINIC_SHIFT_HOURS = {
  MORNING: {
    label: "صباحي",
    start: "07:00",
    end: "14:00",
  },
  EVENING: {
    label: "مسائي",
    start: "16:00",
    end: "22:00",
  },
} as const;

export type ClinicShiftCode = keyof typeof CLINIC_SHIFT_HOURS;
