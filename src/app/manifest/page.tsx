import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/public-header";
import { ArrowLeft, FileText, Brain, TrendingUp } from "lucide-react";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("metadata");
  return {
    title: tMeta("manifest"),
    description: tMeta("manifestDescription"),
  };
}

export default async function ManifestPage() {
  const [t, tNav, tLanding] = await Promise.all([getTranslations("manifest"), getTranslations("common"), getTranslations("landing")]);

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <PublicHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12">
          {/* Back button */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {tNav("back")}
              </Link>
            </Button>
          </div>

          {/* Title Section */}
          <div className="mb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
              {t("title")}
            </h1>
            <p className="text-xl text-foreground/80 font-medium mb-2">
              {t("subtitle")}
            </p>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
              {t("description")}
            </p>
          </div>

          {/* History Section */}
          <div className="mb-16">
            <Card className="border-0 shadow-sm bg-muted/30">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-semibold mb-3">
                  {t("historyTitle")}
                </h2>
                <p className="text-lg text-foreground/70">
                  {t("historyDescription")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Belief Section */}
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold mb-4">
              {t("beliefTitle")}
            </h2>
          </div>

          {/* Principles Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-8 text-center">
              {t("principlesTitle")}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {["principles.0", "principles.1", "principles.2", "principles.3", "principles.4"].map((principleKey) => (
                <Card key={principleKey} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <p className="font-medium">{t(principleKey)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Doctor Focus Section */}
          <div className="mb-16">
            <Card className="border-0 shadow-sm bg-primary/5">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Brain className="h-6 w-6" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold mb-3">
                  {t("doctorFocusTitle")}
                </h2>
                <p className="text-lg text-foreground/70">
                  {t("doctorFocusDescription")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Technology Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              {t("technologyTitle")}
            </h2>
            <p className="text-lg text-foreground/70 text-center mb-8">
              {t("technologyDescription")}
            </p>
          </div>

          {/* IMI Section */}
          <div className="mb-16">
            <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    IMI Health
                  </Badge>
                </div>
                <h2 className="text-2xl font-semibold mb-3">
                  {t("imiTitle")}
                </h2>
                <p className="text-lg text-foreground/70">
                  {t("imiDescription")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Benefits Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-8 text-center">
              {t("benefitsTitle")}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {["benefits.0", "benefits.1", "benefits.2", "benefits.3"].map((benefitKey) => (
                <Card key={benefitKey} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <p className="font-medium">{t(benefitKey)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Conclusion Sections */}
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">{t("conclusion1")}</h2>
              <p className="text-xl text-foreground/80">{t("conclusion2")}</p>
            </div>
            
            <div className="border-t border-border/60 pt-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground/90">
                {t("finalStatement")}
              </h2>
              <p className="text-xl font-bold text-primary">
                {t("finalConclusion")}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <p className="text-sm text-foreground/60">
            {tLanding("copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
              {tLanding("signIn")}
            </Link>
            <Link href="/signup" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
              {tLanding("signUp")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
