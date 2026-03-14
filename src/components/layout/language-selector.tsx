"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { LOCALE_COOKIE } from "@/lib/locale";

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "lo", name: "Lao", nativeName: "ລາວ" },
] as const;

export function LanguageSelector() {
  const currentLocale = useLocale();
  const t = useTranslations("common");
  const { authFetch, user } = useAuth();
  const [isPending, startTransition] = useTransition();

  async function handleLocaleChange(newLocale: string) {
    // Set the cookie
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;

    // If user is authenticated, persist to their profile
    if (user) {
      try {
        await authFetch(`/api/v1/users/${user.id}/locale`, {
          method: "PATCH",
          body: JSON.stringify({ locale: newLocale }),
        });
      } catch {
        // Cookie is set anyway, so the locale change will still work
      }
    }

    // Reload to apply the new locale (next-intl server-side resolution)
    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <Select value={currentLocale} onValueChange={handleLocaleChange} disabled={isPending}>
      <SelectTrigger className="w-auto gap-1.5 border-0 bg-transparent shadow-none h-9 px-2 text-sm font-medium">
        <Globe className="h-4 w-4" />
        <SelectValue>
          {LANGUAGES.find((l) => l.code === currentLocale)?.nativeName || t("language")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.nativeName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
