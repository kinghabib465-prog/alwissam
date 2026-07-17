import Link from "next/link";
import { ClinicLogo } from "@/components/branding/ClinicLogo";

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  alternateHref,
  alternateLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  alternateHref?: string;
  alternateLabel?: string;
}) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.82fr)]">
      <section className="login-hero relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <ClinicLogo light href="/" />
        <div className="max-w-lg">
          <p className="mb-3 text-sm font-bold tracking-wide text-soft-teal">
            عيادة الوسام لطب الأسنان
          </p>
          <h2 className="text-4xl font-bold leading-tight">
            رعاية منظمة تبدأ من دخول آمن وواضح.
          </h2>
          <p className="mt-4 max-w-md text-base leading-8 text-white/75">
            بوابة موحّدة وآمنة للطاقم والمرضى، مصممة لتسهيل العمل اليومي
            وحماية بيانات العيادة.
          </p>
        </div>
        <p className="text-xs text-white/55">
          بيانات الدخول خاصة بصاحب الحساب ولا تُشارك مع الآخرين.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <ClinicLogo />
            <Link
              href="/"
              className="text-sm font-semibold text-muted transition-colors hover:text-teal"
            >
              العودة للرئيسية
            </Link>
          </div>

          <div className="card-surface p-6 sm:p-8">
            <header className="mb-6">
              <p className="text-sm font-bold text-teal">{eyebrow}</p>
              <h1 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted">{description}</p>
            </header>

            {children}
          </div>

          {alternateHref && alternateLabel ? (
            <p className="mt-5 text-center text-sm text-muted">
              <Link
                href={alternateHref}
                className="font-bold text-teal transition-colors hover:text-navy"
              >
                {alternateLabel}
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
