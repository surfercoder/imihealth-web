"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TriggerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  iconOnly: boolean;
  label: string;
}

export function TriggerButton({ ref, iconOnly, label, ...props }: TriggerButtonProps) {
  if (iconOnly) {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-emerald-100/50"
        {...props}
      >
        <FileText className="size-6 text-emerald-600" />
      </Button>
    );
  }
  return (
    <Button ref={ref} variant="outline" size="sm" {...props}>
      <FileText className="size-4 mr-1.5" />
      {label}
    </Button>
  );
}
