"use client";
import { useMemo } from "react";
import { inferGender } from "@/lib/attendance/gender";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const M_GRADIENTS = [
  "from-cyan-500 to-indigo-500",
  "from-sky-500 to-blue-600",
  "from-teal-500 to-cyan-600",
  "from-blue-500 to-violet-500",
];

const F_GRADIENTS = [
  "from-fuchsia-500 to-rose-500",
  "from-pink-500 to-rose-500",
  "from-rose-500 to-orange-500",
  "from-violet-500 to-fuchsia-500",
];

interface AvatarPillProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarPill({ name, size = "md", className }: AvatarPillProps) {
  const { letters, gradient } = useMemo(() => {
    const g = inferGender(name);
    const list = g === "f" ? F_GRADIENTS : M_GRADIENTS;
    return {
      letters: initials(name),
      gradient: list[hashCode(name) % list.length],
    };
  }, [name]);

  const sizeCls =
    size === "sm"
      ? "h-7 w-7 text-[10px]"
      : size === "lg"
        ? "h-10 w-10 text-sm"
        : "h-8 w-8 text-[11px]";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-1 ring-white/40 dark:ring-zinc-900/60",
        gradient,
        sizeCls,
        className,
      )}
      aria-hidden
    >
      {letters}
    </span>
  );
}
