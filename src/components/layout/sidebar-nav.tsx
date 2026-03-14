"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  Pill,
  FlaskConical,
  BedDouble,
  UserCog,
  BarChart3,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Separator } from "@/components/ui/separator";

import type { UserRole } from "@prisma/client";

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  section: string;
};

const navItems: NavItem[] = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, section: "main" },
  { href: "/patients", labelKey: "nav.patients", icon: Users, section: "clinical" },
  { href: "/appointments", labelKey: "nav.appointments", icon: CalendarDays, section: "clinical" },
  { href: "/billing", labelKey: "nav.billing", icon: Receipt, section: "operations" },
  { href: "/pharmacy", labelKey: "nav.pharmacy", icon: Pill, section: "clinical" },
  { href: "/laboratory", labelKey: "nav.laboratory", icon: FlaskConical, section: "clinical" },
  { href: "/ward", labelKey: "nav.wardManagement", icon: BedDouble, section: "clinical" },
  { href: "/users", labelKey: "nav.staff", icon: UserCog, section: "admin" },
  { href: "/reports", labelKey: "nav.reports", icon: BarChart3, section: "admin" },
];

const sectionLabelKeys: Record<string, string> = {
  main: "",
  clinical: "nav.clinical",
  operations: "nav.operations",
  admin: "nav.administration",
};

const roleRoutes: Record<UserRole, string[]> = {
  receptionist: ["/", "/patients", "/appointments", "/billing"],
  admin: ["/", "/patients", "/appointments", "/billing", "/pharmacy", "/users", "/reports"],
  doctor: ["/", "/patients", "/appointments", "/pharmacy", "/laboratory"],
  nurse: ["/", "/patients", "/appointments", "/ward"],
  director: ["/", "/patients", "/appointments", "/billing", "/pharmacy", "/users", "/reports"],
  lab_tech: ["/", "/laboratory"],
  pharmacist: ["/", "/pharmacy"],
  paramedic: ["/", "/patients", "/appointments", "/ward"],
};

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations("common");

  const allowedRoutes = user ? roleRoutes[user.role] : ["/"];
  const filteredItems = navItems.filter((item) => allowedRoutes.includes(item.href));

  // Group items by section
  const sections: Record<string, typeof filteredItems> = {};
  for (const item of filteredItems) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <nav className="flex-1 space-y-1">
        {Object.entries(sections).map(([section, items], sectionIdx) => (
          <div key={section}>
            {sectionIdx > 0 && sectionLabelKeys[section] && (
              <>
                <Separator className="my-3" />
                <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {t(sectionLabelKeys[section])}
                </p>
              </>
            )}
            {items.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive && "text-blue-600 dark:text-blue-400",
                    )}
                  />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User profile section */}
      {user && (
        <div className="mt-auto pt-4">
          <Separator className="mb-4" />
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150",
              pathname === "/profile"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : "hover:bg-accent",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-sm font-semibold flex-shrink-0">
              {user.firstName?.[0]?.toUpperCase() || user.username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.firstName || user.username}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t(`roles.${user.role}`)}
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

export function SidebarBrand() {
  const t = useTranslations("common");

  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
        <Activity className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-base font-bold leading-none">{t("appName")}</h2>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
          {t("nav.hospitalManagement")}
        </p>
      </div>
    </div>
  );
}

export { navItems };
