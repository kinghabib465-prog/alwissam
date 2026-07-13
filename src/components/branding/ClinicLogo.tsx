import Link from "next/link";
import { cn } from "@/lib/utils";

type ClinicLogoProps = {
  href?: string;
  compact?: boolean;
  light?: boolean;
  className?: string;
};

export function ClinicLogo({
  href = "/",
  compact = false,
  light = false,
  className,
}: ClinicLogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl",
          light ? "bg-white/15 text-white" : "bg-soft-teal text-teal",
        )}
        aria-hidden
      >
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
          <path
            d="M24 6c-4.2 0-7.5 2.8-8.6 6.8-.7 2.5-1.4 5.8-1.8 8.6-.5 3.4.2 6.7 2.1 9.1 1.5 1.9 2.4 4.2 2.4 6.6v4.2c0 1.3 1.4 2.1 2.6 1.5l3.3-1.7c.6-.3 1.4-.3 2 0l3.3 1.7c1.2.6 2.6-.2 2.6-1.5v-4.2c0-2.4.9-4.7 2.4-6.6 1.9-2.4 2.6-5.7 2.1-9.1-.4-2.8-1.1-6.1-1.8-8.6C31.5 8.8 28.2 6 24 6Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M18.5 18.5c1.8-1.4 3.8-2.1 5.5-2.1s3.7.7 5.5 2.1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "text-base font-bold tracking-tight sm:text-lg",
            light ? "text-white" : "text-navy",
          )}
        >
          عيادة الوسام
        </span>
        {!compact && (
          <span
            className={cn(
              "text-xs font-medium",
              light ? "text-white/80" : "text-muted",
            )}
          >
            لطب الأسنان
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="focus-ring rounded-xl">
      {content}
    </Link>
  );
}
