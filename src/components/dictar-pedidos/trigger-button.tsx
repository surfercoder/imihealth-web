"use client";

import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TriggerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  label: string;
}

export function TriggerButton({ ref, label, ...props }: TriggerButtonProps) {
  return (
    <Button ref={ref} size="sm" variant="outline" type="button" {...props}>
      <Mic className="size-4 mr-1.5" />
      {label}
    </Button>
  );
}
