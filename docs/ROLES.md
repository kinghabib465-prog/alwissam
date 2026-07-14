## Roles & permissions

| Role | Dashboard | Key capabilities |
|------|-----------|------------------|
| ADMIN | `/admin/dashboard` | Users, secretaries, schedules, services, settings, reports, audit |
| SECRETARY | `/secretary/dashboard` | Requests, calendar, waiting room, patients, payments, messages |
| DOCTOR_SPECIALIST | `/doctor/specialist/dashboard` | Orthodontics, surgery, multi-session plans, referrals in |
| DOCTOR_GENERAL | `/doctor/general/dashboard` | Emergencies, routine care, referrals out, dental chart |
| PATIENT | `/patient/dashboard` | Own appointments, plans, prescriptions, payments, files |

Secretary accounts share the same UI and permissions. Each secretary has a separate user identity; audit messages include the acting secretary name (e.g. `تم تأكيد الموعد بواسطة سمار بدر الدين`).

Doctors and admin can approve long-term patient account activation. Secretaries may request activation only.
