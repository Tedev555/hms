import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/patients", label: "Patients" },
  { href: "/appointments", label: "Appointments" },
  { href: "/billing", label: "Billing" },
  { href: "/pharmacy", label: "Pharmacy" },
  { href: "/laboratory", label: "Laboratory" },
  { href: "/ward", label: "Ward Management" },
  { href: "/users", label: "Staff" },
  { href: "/reports", label: "Reports" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r bg-card md:block">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold">HMS</h2>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-sm font-medium text-muted-foreground">
            Hospital Management System
          </h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
