import { Phone, Mail, MapPin } from "lucide-react";
import { toLatinDigits } from "@/lib/latin-digits";
import type { ClinicContactInfo } from "@/lib/clinic-contact";

/** لافتة اتصل بنا — تظهر في حساب المريض */
export function PatientContactBanner({
  contact,
}: {
  contact: ClinicContactInfo;
}) {
  const phone = contact.phone?.trim();
  const email = contact.email?.trim();
  const address = contact.address?.trim();
  const telHref = phone
    ? `tel:${phone.replace(/[\s\-]/g, "")}`
    : null;

  return (
    <aside className="overflow-hidden rounded-2xl border-2 border-teal/35 bg-gradient-to-l from-soft-teal/80 via-white to-white shadow-sm">
      <div className="border-b border-teal/20 bg-teal px-4 py-2.5 text-center">
        <p className="text-sm font-bold text-white">اتصل بنا</p>
        <p className="text-xs text-white/85">للاستفسار أو تأكيد الموعد</p>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-center text-sm font-bold text-navy">
          {contact.nameAr || "عيادة الوسام لطب الأسنان"}
        </p>
        {phone ? (
          <a
            href={telHref || undefined}
            className="flex items-center justify-center gap-2 rounded-xl bg-soft-teal/50 px-3 py-3 text-center transition hover:bg-soft-teal"
          >
            <Phone className="h-5 w-5 shrink-0 text-teal" aria-hidden />
            <span
              className="font-latin text-lg font-bold text-teal"
              data-numeric="true"
              dir="ltr"
            >
              {toLatinDigits(phone)}
            </span>
          </a>
        ) : null}
        <div className="space-y-2 text-sm text-navy">
          {email ? (
            <p className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
              <a
                href={`mailto:${email}`}
                className="font-latin break-all text-teal hover:underline"
                dir="ltr"
              >
                {email}
              </a>
            </p>
          ) : null}
          {address ? (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span>{address}</span>
            </p>
          ) : null}
          {contact.mapsLink ? (
            <a
              href={contact.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block pt-1 text-center text-xs font-semibold text-teal hover:underline"
            >
              فتح الموقع على الخريطة
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
