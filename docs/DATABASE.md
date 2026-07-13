## Database relationships (overview)

```text
User ── Role
User ── Session / LoginHistory / AuditLog
User ── Doctor | SecretaryProfile | PatientAccount

Patient ── PatientAccount ── User
Patient ── AppointmentRequest / Appointment
Patient ── MedicalHistory / DentalChart / Diagnosis
Patient ── TreatmentPlan ── TreatmentPlanStage / TreatmentSession
Patient ── OrthodonticCase ── OrthodonticSession
Patient ── SurgeryCase ── Operation / PostOperationFollowUp
Patient ── Invoice ── Payment / Installment
Patient ── MedicalDocument / Prescription / Referral

Doctor ── WorkingHour / DoctorScheduleException
Doctor ── Appointment / WaitingRoomEntry
Doctor ── OrthodonticCase / SurgeryCase / Prescription

AppointmentRequest ── Appointment (after confirmation)
Appointment ── AppointmentStatusHistory / WaitingRoomEntry
```

Indexes cover doctor schedules, appointment times, patient phone/number, audit timestamps, and payment dates.
Soft deletes: `User.deletedAt`, `Patient.deletedAt`, `Appointment.deletedAt`, document `deletedAt`.
Payments are never hard-deleted; use `PaymentStatus.VOIDED`.
