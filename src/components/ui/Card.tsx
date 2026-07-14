import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("card-surface p-5", className)}>{children}</div>;
}

export function StatCard({
  title,
  value,
  icon,
  tone = "blue",
}: {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: "blue" | "teal" | "navy" | "warning" | "danger" | "success";
}) {
  const tones = {
    blue: "bg-[#E8F3F8] text-blue",
    teal: "bg-soft-teal text-teal",
    navy: "bg-[#E8EEF5] text-navy",
    warning: "bg-[#FFF7E8] text-warning",
    danger: "bg-[#FDECEE] text-danger",
    success: "bg-[#E8F8F0] text-success",
  };

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-sm text-muted">{title}</p>
        <p className="mt-1 font-latin text-2xl font-bold text-navy">{value}</p>
      </div>
      {icon && (
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl",
            tones[tone],
          )}
        >
          {icon}
        </div>
      )}
    </Card>
  );
}

export function StatusBadge({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "teal" | "navy" | "warning" | "danger" | "success" | "muted";
}) {
  const tones = {
    blue: "bg-[#E8F3F8] text-blue",
    teal: "bg-soft-teal text-teal",
    navy: "bg-[#E8EEF5] text-navy",
    warning: "bg-[#FFF7E8] text-warning",
    danger: "bg-[#FDECEE] text-danger",
    success: "bg-[#E8F8F0] text-success",
    muted: "bg-[#F2F4F7] text-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-2xl bg-[#E8EEF5]", className)} />
  );
}
