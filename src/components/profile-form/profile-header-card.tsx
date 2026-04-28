"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Phone, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { getDoctorInitials } from "@/lib/avatar";
import type { DoctorProfile } from "./schema";

interface ProfileHeaderCardProps {
  doctor: DoctorProfile;
}

export function ProfileHeaderCard({ doctor }: ProfileHeaderCardProps) {
  const t = useTranslations("profilePage");
  const tAvatar = useTranslations("avatarUpload");
  const initials = getDoctorInitials(doctor.name);

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-6">
        <Avatar className="size-16 border border-border">
          {doctor.avatar ? (
            <AvatarImage src={doctor.avatar} alt={tAvatar("alt")} />
          ) : null}
          <AvatarFallback>
            {initials ? (
              <span className="text-lg">{initials}</span>
            ) : (
              <User className="size-8" />
            )}
          </AvatarFallback>
        </Avatar>
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
