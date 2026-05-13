"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

const PASSWORD_RULES = [
  { key: "minLength" as const, test: (pw: string) => pw.length >= 8 },
  { key: "hasLowercase" as const, test: (pw: string) => /[a-z]/.test(pw) },
  { key: "hasUppercase" as const, test: (pw: string) => /[A-Z]/.test(pw) },
  { key: "hasDigit" as const, test: (pw: string) => /\d/.test(pw) },
  { key: "hasSpecial" as const, test: (pw: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(pw) },
] as const;

export function allRulesPass(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

interface PasswordStrengthChecklistProps {
  password: string;
}

export function PasswordStrengthChecklist({ password }: PasswordStrengthChecklistProps) {
  const t = useTranslations("passwordStrength");

  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1.5">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li key={rule.key} className="flex items-center gap-2 text-xs">
            {passed ? (
              <Check className="size-3.5 shrink-0 text-emerald-500" />
            ) : (
              <X className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className={passed ? "text-emerald-600" : "text-muted-foreground"}>
              {t(rule.key)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
