import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r bg-card md:block">
        <div className="flex h-16 items-center px-6">
          <h2 className="text-lg font-semibold">HMS</h2>
        </div>
        <Separator />
        <SidebarNav className="p-4" />
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <header className="flex h-16 items-center gap-4 border-b px-6">
          <MobileSidebar />
          <h1 className="text-sm font-medium text-muted-foreground">
            Hospital Management System
          </h1>
        </header>
        <div className="p-6">{children}</div>
      </main>

      <Toaster />
    </div>
  );
}
