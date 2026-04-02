import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Authentication Error | IMI Health",
};

export default async function AuthErrorPage() {
  const t = await getTranslations("authError");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <XCircle className="size-6" />
            </div>
            <div>
              <p className="font-semibold">{t("title")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("description")}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button asChild>
                <Link href="/login">{t("backToLogin")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/forgot-password">{t("requestNewLink")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
