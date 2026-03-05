"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!bg-[#362f62] !text-[#EBEBEB] !border !border-white/10 !shadow-xl !rounded-[var(--radius)]",
          title: "!text-[#EBEBEB] !font-medium",
          description: "!text-[#a89fc4]",
          success: "!text-[#59C3C3] [&>[data-icon]]:!text-[#59C3C3]",
          error: "!text-[#FF6047] [&>[data-icon]]:!text-[#FF6047]",
          actionButton: "!bg-[#5877C6] !text-white",
          cancelButton: "!bg-white/10 !text-[#EBEBEB]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
