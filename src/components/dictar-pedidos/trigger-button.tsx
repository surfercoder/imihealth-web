"use client";

import { forwardRef } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TriggerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export const TriggerButton = forwardRef<HTMLButtonElement, TriggerButtonProps>(
  function TriggerButton({ label, ...props }, ref) {
    return (
      <Button
        ref={ref}
        size="sm"
        variant="outline"
        type="button"
        {...props}
      >
        <Mic className="size-4 mr-1.5" />
        {label}
      </Button>
    );
  },
);
