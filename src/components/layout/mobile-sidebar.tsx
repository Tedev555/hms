"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav, SidebarBrand } from "@/components/layout/sidebar-nav";

export function MobileSidebar() {
  const t = useTranslations("common");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t("toggleMenu")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 flex flex-col">
        <SheetHeader className="border-b p-0">
          <SheetTitle asChild>
            <SidebarBrand />
          </SheetTitle>
        </SheetHeader>
        <SidebarNav className="p-3 flex-1" />
      </SheetContent>
    </Sheet>
  );
}
