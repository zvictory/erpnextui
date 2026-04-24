"use client";

import { type ReactNode } from "react";
import { useDocUpdates } from "@/hooks/use-doc-updates";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  useDocUpdates();
  return <>{children}</>;
}
