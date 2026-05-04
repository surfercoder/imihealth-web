"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { feedbackEmail } from "@/lib/email-template";

const REASON_KEYS = [
  "feedback",
  "bug",
  "question",
  "improvement",
  "support",
] as const;

interface FeedbackDialogProps {
  doctorName?: string | null;
  doctorEmail?: string | null;
}

export function FeedbackDialog({ doctorName, doctorEmail }: FeedbackDialogProps) {
  const t = useTranslations("feedbackDialog");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const tEmail = useTranslations("feedbackEmailLabels");

  async function handleSubmit() {
    if (!reason || !message.trim()) return;

    setSending(true);
    const reasonLabel = t(`reasons.${reason}` as Parameters<typeof t>[0]);
    const senderName = doctorName ?? "Unknown";
    const pageUrl = `${window.location.origin}${pathname}`;
    const plainText = `From: ${senderName} (${doctorEmail ?? "No email"})\n\nPage: ${pageUrl}\n\nReason: ${reasonLabel}\n\nMessage:\n${message.trim()}`;
    const html = feedbackEmail({
      senderName,
      senderEmail: doctorEmail ?? "No email",
      reason: reasonLabel,
      message: message.trim(),
      pageUrl,
      labels: {
        subtitle: tEmail("subtitle"),
        from: tEmail("from"),
        page: tEmail("page"),
        reason: tEmail("reason"),
        preheader: tEmail("preheader").replace("{reason}", reasonLabel).replace("{senderName}", senderName),
      },
    });
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "support@imihealth.ai",
        subject: `[${reasonLabel}] ${t("emailSubject")}`,
        text: plainText,
        html,
        ...(doctorEmail && { replyTo: doctorEmail }),
      }),
    }).catch(() => null);

    if (!res || !res.ok) {
      toast.error(t("errorTitle"), { description: t("errorMessage") });
      setSending(false);
      return;
    }

    toast.success(t("successTitle"), { description: t("successMessage") });
    setOpen(false);
    setReason("");
    setMessage("");
    setSending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground transition-colors cursor-pointer">
          <MessageSquareText className="size-3.5" />
          {t("trigger")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="feedback-reason">{t("reasonLabel")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="feedback-reason">
                <SelectValue placeholder={t("reasonPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {REASON_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`reasons.${key}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-message">{t("messageLabel")}</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || !message.trim() || sending}
          >
            {sending ? t("sending") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
