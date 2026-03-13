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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

import type { UserRole } from "@prisma/client";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/pharmacy", label: "Pharmacy", icon: Pill },
  { href: "/laboratory", label: "Laboratory", icon: FlaskConical },
  { href: "/ward", label: "Ward Management", icon: BedDouble },
  { href: "/users", label: "Staff", icon: UserCog },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

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

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const allowedRoutes = user ? roleRoutes[user.role] : ["/"];
  const filteredItems = navItems.filter((item) => allowedRoutes.includes(item.href));

  return (
    <nav className={cn("space-y-1", className)}>
      {filteredItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground",
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export { navItems };
