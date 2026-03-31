import { FeedbackDialog } from "@/components/feedback-dialog";
import { getTranslations } from "next-intl/server";

interface AppFooterProps {
  doctorName?: string | null;
  doctorEmail?: string | null;
}

export async function AppFooter({ doctorName, doctorEmail }: AppFooterProps) {
  const t = await getTranslations();
  
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 text-sm text-foreground/50">
        {t("common.copyright", { year: new Date().getFullYear() })}
        <FeedbackDialog doctorName={doctorName} doctorEmail={doctorEmail} />
      </div>
    </footer>
  );
}
