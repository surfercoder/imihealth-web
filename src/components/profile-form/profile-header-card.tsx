"use client";

import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DoctorProfile } from "./schema";

interface ProfileHeaderCardProps {
  doctor: DoctorProfile;
}

export function ProfileHeaderCard({ doctor }: ProfileHeaderCardProps) {
  const t = useTranslations("profilePage");

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{doctor.name || t("unnamed")}</h2>
          <p className="text-sm text-muted-foreground">{doctor.especialidad}</p>
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="size-3" />
              {doctor.email}
            </span>
            {doctor.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {doctor.phone}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
