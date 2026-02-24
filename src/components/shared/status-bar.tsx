"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

interface StatusBarProps {
  type: "success" | "error" | "loading" | null;
  message: string;
  linkHref?: string;
  linkText?: string;
}

export function StatusBar({ type, message, linkHref, linkText }: StatusBarProps) {
  if (!type) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-3 text-sm",
        type === "loading" && "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
        type === "success" && "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
        type === "error" && "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
      )}
    >
      {type === "loading" && (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      )}
      {type === "success" && (
        <CheckCircle className="size-4 shrink-0" />
      )}
      {type === "error" && (
        <XCircle className="size-4 shrink-0" />
      )}

      <span className="flex-1">{message}</span>

      {type === "success" && linkHref && linkText && (
        <a
          href={linkHref}
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          {linkText}
        </a>
      )}
    </div>
  );
}
