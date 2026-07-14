import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { Card } from "@/components/ui/Card";
import { getPublicT } from "@/i18n/get-locale";
import { loadClinicContact } from "@/lib/clinic-contact";
import { toGoogleMapsEmbedUrl } from "@/lib/maps-url";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const { t } = await getPublicT();
  const info = await loadClinicContact();
  const phone = info.phone || "0550000000";
  const email = info.email || "contact@alwisam.dz";
  const address = info.address || "الجزائر";
  const name = info.nameAr || t.brand;
  const embed = toGoogleMapsEmbedUrl(info.mapsEmbedUrl || info.mapsLink || "");
  const mapsLink = info.mapsLink || info.mapsEmbedUrl || "";

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-navy">{t.contactTitle}</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="space-y-2">
            <p className="font-semibold">{name}</p>
            <p className="font-latin text-sm" data-numeric="true">
              {phone}
            </p>
            <p className="font-latin text-sm">{email}</p>
            <p className="text-sm">{address}</p>
            {mapsLink ? (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block pt-2 text-sm font-semibold text-teal"
              >
                {t.openMap}
              </a>
            ) : null}
          </Card>
          <Card className="overflow-hidden p-0">
            {embed ? (
              <iframe
                title="clinic map"
                src={embed}
                className="h-56 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="flex h-56 items-center justify-center bg-[#E8EEF5] p-4 text-center text-sm text-muted">
                {t.mapMissing}
              </div>
            )}
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
