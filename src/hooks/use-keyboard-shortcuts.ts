"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const NEW_PAGE_MAP: Record<string, string> = {
  "/sales-invoices": "/sales-invoices/new",
  "/purchase-invoices": "/purchase-invoices/new",
  "/sales-orders": "/sales-orders/new",
  "/purchase-orders": "/purchase-orders/new",
  "/customers": "/customers",
  "/vendors": "/vendors",
  "/products": "/products",
  "/payments": "/payments/receive",
};

export function useKeyboardShortcuts({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't fire inside inputs / textareas / contenteditable
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // ? -> show shortcuts dialog
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onShowShortcuts();
        return;
      }

      // Cmd/Ctrl+N -> new page for current context
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        const basePath = Object.keys(NEW_PAGE_MAP).find((p) => pathname.startsWith(p));
        if (basePath) {
          e.preventDefault();
          router.push(NEW_PAGE_MAP[basePath]);
        }
        return;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, pathname, onShowShortcuts]);
}
