import Link from "next/link";
import { ClinicLogo } from "@/components/branding/ClinicLogo";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";
import { loadClinicContact } from "@/lib/clinic-contact";
import { getPublicT } from "@/i18n/get-locale";

export async function PublicHeader() {
  const { locale, t } = await getPublicT();
  const links = [
    { href: "/", label: t.navHome },
    { href: "/services", label: t.navServices },
    { href: "/faq", label: t.navFaq },
    { href: "/contact", label: t.navContact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <ClinicLogo />
        <nav className="hidden items-center gap-5 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted hover:text-navy"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} />
          <Link href="/patient/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              {t.patientLogin}
            </Button>
          </Link>
          <Link href="/#register">
            <Button size="sm">{t.register}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export async function PublicFooter() {
  const { t } = await getPublicT();
  const contact = await loadClinicContact();
  const phone = contact.phone || process.env.CLINIC_PHONE || "0550000000";
  const email = contact.email || process.env.CLINIC_EMAIL || "contact@alwisam.dz";
  const address = contact.address || process.env.CLINIC_ADDRESS || "الجزائر";
  const mapsHref = contact.mapsLink || contact.mapsEmbedUrl || "/contact";
  const links = [
    { href: "/", label: t.navHome },
    { href: "/services", label: t.navServices },
    { href: "/faq", label: t.navFaq },
    { href: "/contact", label: t.navContact },
  ];

  return (
    <footer className="mt-16 border-t border-border bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <ClinicLogo light href="/" />
          <p className="mt-4 max-w-sm text-sm text-white/75">{t.footerAbout}</p>
        </div>
        <div>
          <h3 className="font-semibold">{t.quickLinks}</h3>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/75">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold">{t.contactUs}</h3>
          <div className="mt-3 space-y-2 text-sm text-white/75">
            <p className="font-latin" data-numeric="true" dir="ltr">
              {phone}
            </p>
            <p className="font-latin" dir="ltr">
              {email}
            </p>
            <p>{address}</p>
            <Link href="/contact" className="inline-block text-soft-teal hover:underline">
              {t.contactPageMap}
            </Link>
            {contact.mapsLink || contact.mapsEmbedUrl ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-soft-teal hover:underline"
              >
                {t.openMap}
              </a>
            ) : null}
            <Link href="/staff/login" className="inline-block pt-2 text-soft-teal hover:underline">
              {t.staffLogin}
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} {t.brand} — {t.rights}
      </div>
    </footer>
  );
}
