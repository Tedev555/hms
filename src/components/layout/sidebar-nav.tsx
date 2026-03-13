"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { href: "/patients", label: "Patients", icon: Users, section: "clinical" },
  { href: "/appointments", label: "Appointments", icon: CalendarDays, section: "clinical" },
  { href: "/billing", label: "Billing", icon: Receipt, section: "operations" },
  { href: "/pharmacy", label: "Pharmacy", icon: Pill, section: "clinical" },
  { href: "/laboratory", label: "Laboratory", icon: FlaskConical, section: "clinical" },
  { href: "/ward", label: "Ward Management", icon: BedDouble, section: "clinical" },
  { href: "/users", label: "Staff", icon: UserCog, section: "admin" },
  { href: "/reports", label: "Reports", icon: BarChart3, section: "admin" },
];

const sectionLabels: Record<string, string> = {
  main: "",
  clinical: "Clinical",
  operations: "Operations",
  admin: "Administration",
};

const roleRoutes: Record<UserRole, string[]> = {
  receptionist: ["/", "/patients", "/appointments", "/billing"],
  admin: ["/", "/patients", "/appointments", "/billing", "/users", "/reports"],
  doctor: ["/", "/patients", "/appointments", "/laboratory"],
  nurse: ["/", "/patients", "/appointments", "/ward"],
  director: ["/", "/patients", "/appointments", "/billing", "/users", "/reports"],
  lab_tech: ["/", "/laboratory"],
  pharmacist: ["/", "/pharmacy"],
  paramedic: ["/", "/patients", "/appointments", "/ward"],
};

const roleLabels: Record<string, string> = {
  receptionist: "Receptionist",
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  director: "Director",
  lab_tech: "Lab Technician",
  pharmacist: "Pharmacist",
  paramedic: "Paramedic",
};

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();

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
            {sectionIdx > 0 && sectionLabels[section] && (
              <>
                <Separator className="my-3" />
                <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {sectionLabels[section]}
                </p>
              </>
            )}
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
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
                  {item.label}
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
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-sm font-semibold flex-shrink-0">
              {user.firstName?.[0]?.toUpperCase() || user.username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName || user.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {roleLabels[user.role] || user.role}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
        <Activity className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-base font-bold leading-none">HMS</h2>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Hospital Management</p>
      </div>
    </div>
  );
}

export { navItems };
