"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { PackingListPrint } from "@/components/print/packing-list-print";
import { useCompanyStore } from "@/stores/company-store";
import type { SalesOrder } from "@/types/sales-order";
import { Loader2 } from "lucide-react";

export default function PackingListPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const company = useCompanyStore((s) => s.company);

  const { data: order, isLoading } = useQuery({
    queryKey: ["salesOrders", id],
    queryFn: () => frappe.getDoc<SalesOrder>("Sales Order", id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Order not found
      </div>
    );
  }

  return <PackingListPrint order={order} companyName={company} />;
}
