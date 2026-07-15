import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, "يرجى إدخال البريد الإلكتروني أو رقم الهاتف"),
  password: z.string().min(6, "كلمة المرور قصيرة جدًا"),
  rememberMe: z.boolean().optional().default(false),
});

export const bookAppointmentSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z
    .string()
    .min(8, "رقم الهاتف مطلوب")
    .transform((v) => v.trim()),
  age: z.coerce.number().int().min(1).max(120).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  city: z.string().optional(),
  reason: z.string().optional().default(""),
  appointmentType: z.enum([
    "GENERAL_EXAM",
    "EMERGENCY",
    "TOOTHACHE",
    "CLEANING",
    "FILLING",
    "EXTRACTION",
    "ROOT_CANAL",
    "ORTHO_CONSULT",
    "ORTHO_FOLLOWUP",
    "PROSTHETICS",
    "SURGERY_CONSULT",
    "SURGERY",
    "POST_OP_FOLLOWUP",
    "LASER_WHITENING",
    "OTHER",
  ]),
  isEmergency: z.boolean().default(false),
  preferredDoctorId: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  isPreviousPatient: z.boolean().default(false),
  hasOrthodontics: z.boolean().default(false),
  previousSurgery: z.boolean().default(false),
  additionalNotes: z.string().optional(),
  chronicIllnesses: z.string().max(500).optional(),
  consentAccepted: z.boolean().refine((v) => v === true, {
    message: "يجب الموافقة على الشروط",
  }),
}).refine(
  (data) =>
    data.appointmentType !== "OTHER" ||
    (data.reason && data.reason.trim().length >= 2),
  { message: "اكتب سبب الزيارة عند اختيار «أخرى»", path: ["reason"] },
);

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  notes: z.string().optional(),
});

export const patientCreateSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  email: z.string().email("البريد غير صالح").optional().or(z.literal("")),
  age: z.coerce.number().int().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});
