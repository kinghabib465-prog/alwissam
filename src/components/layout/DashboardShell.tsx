"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  ChevronDown,
  ClipboardList,
  Clock,
  FolderOpen,
  LayoutDashboard,
  List,
  ListChecks,
  LogOut,
  MapPin,
  MessageSquare,
  Pill,
  Receipt,
  RefreshCw,
  ScrollText,
  Settings,
  Smile,
  Stethoscope,
  User,
  UserCog,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { ClinicLogo } from "@/components/branding/ClinicLogo";
import { cn } from "@/lib/utils";
import { StaffChatWidget } from "@/components/staff/StaffChatWidget";

const ICONS = {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Users,
  UserRound,
  ArrowLeftRight,
  Wallet,
  Receipt,
  MessageSquare,
  BarChart3,
  Smile,
  Activity,
  Stethoscope,
  RefreshCw,
  UserCog,
  ListChecks,
  Clock,
  Settings,
  ScrollText,
  List,
  Pill,
  FolderOpen,
  User,
  MapPin,
};

export type SidebarItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  children?: { href: string; label: string }[];
};

function NavLink({
  href,
  label,
  icon,
  nested,
}: {
  href: string;
  label: string;
  icon?: keyof typeof ICONS;
  nested?: boolean;
}) {
  const pathname = usePathname();
  const Icon = icon ? ICONS[icon] || LayoutDashboard : null;
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        nested && "py-2 pr-4 text-[13px]",
        active
          ? "bg-white/15 text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white",
      )}
    >
      {Icon && <Icon className="h-4.5 w-4.5 shrink-0" />}
      {label}
    </Link>
  );
}

function NavGroup({ item }: { item: SidebarItem }) {
  const pathname = usePathname();
  const children = item.children || [];
  const underGroup = children.some(
    (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
  );
  // يبقى مفتوحاً أثناء التنقّل داخل المجموعة (مثل الإعدادات ويوم العمل)
  const [open, setOpen] = useState(underGroup);
  const Icon = ICONS[item.icon] || Settings;

  useEffect(() => {
    if (underGroup) setOpen(true);
  }, [underGroup]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
          underGroup
            ? "bg-white/10 text-white"
            : "text-white/75 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        <span className="flex-1 text-right">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="mt-1 space-y-0.5 border-r border-white/15 mr-5 pr-1">
          {children.map((child) => (
            <NavLink
              key={child.href}
              href={child.href}
              label={child.label}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  items,
  userName,
  onLogout,
}: {
  items: SidebarItem[];
  userName: string;
  onLogout?: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 flex-col bg-navy text-white lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <ClinicLogo light href={items[0]?.href || "/"} />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) =>
          item.children?.length ? (
            <NavGroup key={item.href} item={item} />
          ) : (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ),
        )}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold">{userName}</p>
        <form action={onLogout ? undefined : "/api/auth/logout"} method="post">
          <button
            type={onLogout ? "button" : "submit"}
            onClick={onLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </form>
      </div>
    </aside>
  );
}

export function TopHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export function DashboardShell({
  items,
  userName,
  children,
}: {
  items: SidebarItem[];
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar items={items} userName={userName} />
      <main className="lg:pr-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
      </main>
      <StaffChatWidget />
    </div>
  );
}
