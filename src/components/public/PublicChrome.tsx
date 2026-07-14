import Link from "next/link";
import { ClinicLogo } from "@/components/branding/ClinicLogo";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/services", label: "الخدمات" },
  { href: "/faq", label: "الأسئلة" },
  { href: "/contact", label: "تواصل معنا" },
];

export function PublicHeader() {
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
          <Link href="/patient/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              دخول المريض
            </Button>
          </Link>
          <Link href="/#register">
            <Button size="sm">تسجيل</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <ClinicLogo light href="/" />
          <p className="mt-4 max-w-sm text-sm text-white/75">
            رعاية أسنان متخصصة بفريق طبي محترف وتقنيات حديثة لابتسامة صحية تدوم.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">روابط سريعة</h3>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/75">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold">تواصل</h3>
          <div className="mt-3 space-y-2 text-sm text-white/75">
            <p className="font-latin">{process.env.CLINIC_PHONE || "0550000000"}</p>
            <p className="font-latin">{process.env.CLINIC_EMAIL || "contact@alwisam.dz"}</p>
            <p>{process.env.CLINIC_ADDRESS || "الجزائر"}</p>
            <Link href="/staff/login" className="inline-block pt-2 text-soft-teal hover:underline">
              دخول الطاقم الطبي
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} عيادة الوسام لطب الأسنان — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}
