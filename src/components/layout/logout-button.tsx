"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations("common");
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Even if the API call fails, redirect to login
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loading} className="gap-2">
      <LogOut className="h-4 w-4" />
      {loading ? t("signingOut") : t("signOut")}
    </Button>
  );
}
