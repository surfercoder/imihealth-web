import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")        // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")     // bold
    .replace(/\*(.+?)\*/g, "$1")         // italic
    .replace(/__(.+?)__/g, "$1")         // bold (underscore)
    .replace(/_(.+?)_/g, "$1")           // italic (underscore)
    .replace(/~~(.+?)~~/g, "$1")         // strikethrough
    .replace(/`(.+?)`/g, "$1")           // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")  // links
    .replace(/^---$/gm, "")              // horizontal rules
    .replace(/^\s*[-*+]\s+/gm, "- ")     // normalize list markers
    .replace(/\n{3,}/g, "\n\n")          // collapse extra blank lines
    .trim()
}
