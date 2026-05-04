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
import { submitEnterpriseLead } from "@/actions/enterprise-leads";

interface Props {
  children: ReactNode;
}

interface FormState {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  notes: "",
};

export function EnterpriseDialog({ children }: Props) {
  const t = useTranslations("pricing.enterpriseForm");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const updateField = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const requiredOk =
    form.companyName.trim() !== "" &&
    form.contactName.trim() !== "" &&
    form.email.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requiredOk) return;
    setSubmitting(true);
    const result = await submitEnterpriseLead(form);
    setSubmitting(false);
    if (result.error) {
      toast.error(t("errorTitle"), { description: result.error });
      return;
    }
    toast.success(t("successTitle"), { description: t("successMessage") });
    setForm(EMPTY_FORM);
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
                value={form.companyName}
                onChange={(e) => updateField("companyName")(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ent-contact">{t("contactLabel")}</Label>
              <Input
                id="ent-contact"
                value={form.contactName}
                onChange={(e) => updateField("contactName")(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ent-email">{t("emailLabel")}</Label>
              <Input
                id="ent-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email")(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ent-phone">{t("phoneLabel")}</Label>
              <Input
                id="ent-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone")(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ent-notes">{t("notesLabel")}</Label>
              <Textarea
                id="ent-notes"
                value={form.notes}
                onChange={(e) => updateField("notes")(e.target.value)}
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
