"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { getRealtimeSocket } from "@/lib/frappe-realtime";
import { useAuthStore } from "@/stores/auth-store";

interface DocEvent {
  doctype: string;
  name: string;
  modified?: string;
  user?: string;
}

const DOCTYPE_TO_KEY: Record<string, readonly string[]> = {
  "Sales Invoice": ["sales-invoices"],
  "Purchase Invoice": ["purchase-invoices"],
  "Payment Entry": ["payment-entries"],
  "Journal Entry": ["journal-entries"],
  Item: ["items"],
  Customer: ["customers"],
  Supplier: ["suppliers"],
  "Stock Entry": ["stock-entries"],
  "Delivery Note": ["delivery-notes"],
  "Purchase Receipt": ["purchase-receipts"],
};

export function useDocUpdates() {
  const qc = useQueryClient();
  const siteUrl = useAuthStore((s) => s.siteUrl);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!siteUrl || !user) return;

    let sock: Socket;
    try {
      sock = getRealtimeSocket(siteUrl);
    } catch {
      return;
    }

    const invalidate = (doctype: string) => {
      const keys = DOCTYPE_TO_KEY[doctype];
      if (!keys) return;
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    };

    const onDocUpdate = (evt: DocEvent) => {
      if (evt?.doctype) invalidate(evt.doctype);
    };

    const onListUpdate = (evt: DocEvent) => {
      if (evt?.doctype) invalidate(evt.doctype);
    };

    sock.on("doc_update", onDocUpdate);
    sock.on("list_update", onListUpdate);

    return () => {
      sock.off("doc_update", onDocUpdate);
      sock.off("list_update", onListUpdate);
    };
  }, [qc, siteUrl, user]);
}
