import { CheckCircle2, Mail, Phone, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { NewInformeForPatientButton } from "@/components/new-informe-for-patient-button";
import { EditPatientButton } from "@/components/edit-patient-button";
import type { PatientWithStats } from "@/actions/patients";

interface PatientInfoCardProps {
  patient: PatientWithStats;
  patientAge: number | null;
  dobFormatted: string | null;
  labels: {
    yearsOld: string;
    phone: string;
    email: string;
    consults: string;
    consultsCount: string;
  };
}

export function PatientInfoCard({
  patient,
  patientAge,
  dobFormatted,
  labels,
}: PatientInfoCardProps) {
  const { id: patientId, name, email, phone } = patient;
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-5 flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-semibold text-card-foreground">{name}</h1>
            <EditPatientButton patient={patient} />
          </div>
          {patientAge !== null && dobFormatted && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {patientAge} {labels.yearsOld} · {dobFormatted}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <NewInformeForPatientButton patientId={patientId} />
        </div>
      </div>

      <Separator />

      <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Phone className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{labels.phone}</p>
            <p className="text-sm font-medium text-card-foreground">{phone}</p>
          </div>
        </div>

        {email && (
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Mail className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{labels.email}</p>
              <p className="text-sm font-medium text-card-foreground truncate">{email}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{labels.consults}</p>
            <p className="text-sm font-medium text-card-foreground">{labels.consultsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
