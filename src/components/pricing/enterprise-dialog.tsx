"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitEnterpriseLead } from "@/actions/billing";

interface Props {
  children: ReactNode;
}

export function EnterpriseDialog({ children }: Props) {
  const t = useTranslations("pricing.enterpriseForm");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const requiredOk =
    companyName.trim() !== "" &&
    contactName.trim() !== "" &&
    email.trim() !== "";

  function reset() {
    setCompanyName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requiredOk) return;
    setSubmitting(true);
    const result = await submitEnterpriseLead({
      companyName,
      contactName,
      email,
      phone,
      notes,
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(t("errorTitle"), { description: result.error });
      return;
    }
    toast.success(t("successTitle"), { description: t("successMessage") });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ent-company">{t("companyLabel")}</Label>
              <Input
                id="ent-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ent-contact">{t("contactLabel")}</Label>
              <Input
                id="ent-contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ent-email">{t("emailLabel")}</Label>
              <Input
                id="ent-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ent-phone">{t("phoneLabel")}</Label>
              <Input
                id="ent-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ent-notes">{t("notesLabel")}</Label>
              <Textarea
                id="ent-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={2000}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!requiredOk || submitting}>
              {submitting ? t("sending") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
