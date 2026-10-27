"use client";

// Account preferences — Super App AccountsScreen Preferences parity for web:
// theme (next-themes) + language (persisted + POST /users/language).
// Notification preferences intentionally live server-side only (not on web).

import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { customerApi } from "@/lib/booking/api-client";

export const APP_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "ml", label: "മലയാളം" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "bn", label: "বাংলা" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "as", label: "অসমীয়া" },
  { code: "or", label: "ଓଡ଼ିଆ" },
  { code: "ur", label: "اردو" },
] as const;

export const APP_LANGUAGE_KEY = "hawk_app_language_v1";

export function readAppLanguage(): string {
  try {
    return window.localStorage.getItem(APP_LANGUAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

export function AccountPreferences() {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = React.useState("en");
  const [savingLang, setSavingLang] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only hydration.
    setLanguage(readAppLanguage());
  }, []);

  async function changeLanguage(code: string) {
    setLanguage(code);
    try {
      window.localStorage.setItem(APP_LANGUAGE_KEY, code);
    } catch {
      /* ignore */
    }
    setSavingLang(true);
    try {
      await customerApi.setLanguage(code);
    } catch {
      /* local preference kept; server sync is best-effort */
    } finally {
      setSavingLang(false);
    }
  }

  return (
    <div className="border-border/60 glass-2 flex flex-col gap-4 rounded-2xl border p-5">
      <span className="text-foreground font-semibold">Preferences</span>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">Theme</span>
        <div className="flex gap-2">
          {(
            [
              { key: "light", label: "Light" },
              { key: "dark", label: "Dark" },
              { key: "system", label: "System" },
            ] as const
          ).map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={theme === t.key ? "default" : "outline"}
              onClick={() => setTheme(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">
          Language{savingLang ? " · saving…" : ""}
        </span>
        <select
          value={language}
          onChange={(e) => void changeLanguage(e.target.value)}
          className="border-border/70 bg-background/60 h-10 rounded-md border px-3 text-sm outline-none"
          aria-label="App language"
        >
          {APP_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-muted-foreground text-[11px]">
        More languages are coming to the web app soon — your choice is saved and synced to your account.
      </p>
    </div>
  );
}
