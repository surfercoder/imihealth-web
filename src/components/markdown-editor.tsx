"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";

declare module "@tiptap/core" {
  interface Storage {
    markdown: { getMarkdown: () => string };
  }
}

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  disabled,
  ariaLabel,
  className,
}: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        breaks: true,
        transformPastedText: true,
      }),
    ],
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "prose-editor outline-none min-h-[300px]",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.storage.markdown.getMarkdown());
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable === disabled) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  return (
    <EditorContent
      editor={editor}
      className={cn(
        "min-h-[320px] rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm leading-relaxed",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/50",
        "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[300px]",
        "[&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p:last-child]:mb-0",
        "[&_.ProseMirror_h1]:text-lg [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-3 [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h1:first-child]:mt-0",
        "[&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mt-3 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2:first-child]:mt-0",
        "[&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-2 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_h3:first-child]:mt-0",
        "[&_.ProseMirror_strong]:font-semibold",
        "[&_.ProseMirror_em]:italic",
        "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:mb-2",
        "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:mb-2",
        "[&_.ProseMirror_li]:mb-0.5",
        "[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-xs",
        "[&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:italic",
        "[&_.ProseMirror_hr]:border-border [&_.ProseMirror_hr]:my-3",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    />
  );
}
