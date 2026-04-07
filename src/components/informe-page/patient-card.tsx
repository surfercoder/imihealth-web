import { User, Phone, Calendar, Mail } from "lucide-react";

interface PatientCardProps {
  patient: { name: string; phone: string; email: string | null };
  dobFormatted: string | null;
  patientAge: number | null;
  yearsOldLabel: string;
}

export function PatientCard({
  patient,
  dobFormatted,
  patientAge,
  yearsOldLabel,
}: PatientCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base text-card-foreground">{patient.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {patient.phone}
            </span>
            {dobFormatted && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {dobFormatted}{patientAge !== null && ` (${patientAge} ${yearsOldLabel})`}
              </span>
            )}
            {patient.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {patient.email}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
