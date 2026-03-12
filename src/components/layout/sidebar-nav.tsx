import Link from "next/link";
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

export function SidebarNav({ className }: { className?: string }) {
  return (
    <nav className={cn("space-y-1", className)}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export { navItems };
