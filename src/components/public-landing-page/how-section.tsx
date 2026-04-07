import { MessageSquareText, AudioLines, PenLine } from "lucide-react";

type HowSectionProps = {
  t: (key: string) => string;
};

export function HowSection({ t }: HowSectionProps) {
  return (
    <section className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight">
          {t("howTitle")}
        </h2>
        <p className="mb-10 text-center text-foreground/60">{t("howSubtitle")}</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="relative rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquareText className="size-5" />
              </div>
              <span className="text-sm font-medium text-primary">
                {t("howOption")} 1
              </span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">
              {t("howMethod1Title")}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("howMethod1Desc")}
            </p>
          </div>

          <div className="relative rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <AudioLines className="size-5" />
              </div>
              <span className="text-sm font-medium text-primary">
                {t("howOption")} 2
              </span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">
              {t("howMethod2Title")}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("howMethod2Desc")}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PenLine className="size-5" />
            </div>
            <p className="font-medium text-card-foreground">{t("howEditable")}</p>
            <div className="h-px w-16 bg-border" />
            <p className="text-sm text-muted-foreground">{t("howDisclaimer")}</p>
            <p className="text-sm font-semibold text-primary">{t("howTagline")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
