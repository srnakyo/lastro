import { useRouter } from "@tanstack/react-router";
import { useRefreshViewer } from "@/hooks/use-refresh-viewer";
import { Check, Languages, LogOut, Moon, Sun } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePreference } from "@/hooks/use-preference";
import { signOut } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

/** Each language named in itself, so a person finds theirs whatever the screen shows now. */
const LANGS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "English" },
] as const;

export function UserMenu({ user, dark }: { user: { name: string; email: string }; dark: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const refresh = useRefreshViewer();
  const set = usePreference();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary"
        aria-label={user.name}
      >
        {initials(user.name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block text-[13px] font-medium text-foreground">{user.name}</span>
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void set("lastro_theme", dark ? "light" : "dark")}>
          {dark ? <Sun /> : <Moon />} {dark ? t("user.theme.light") : t("user.theme.dark")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Languages className="size-3.5" /> {t("user.language")}
        </DropdownMenuLabel>
        {LANGS.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => option.value !== lang && void set("lastro_lang", option.value)} aria-checked={option.value === lang} role="menuitemradio">
            <Check className={option.value === lang ? "opacity-100" : "opacity-0"} /> {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            await refresh();
            await router.navigate({ to: "/sign-in" });
          }}
        >
          <LogOut /> {t("user.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
