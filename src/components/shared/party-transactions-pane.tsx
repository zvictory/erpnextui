"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { PartyDetailPanel } from "@/components/shared/party-detail-panel";
import type { CurrencyBalance } from "@/types/party-report";
import { useTranslations } from "next-intl";

interface PartyTransactionsPaneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyType: "Customer" | "Supplier";
  partyName: string;
  partyDisplayName: string;
  partyCurrency?: string;
  outstandingBalance: number | null;
  currencyBalances?: CurrencyBalance[];
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PartyTransactionsPane({
  open,
  onOpenChange,
  partyType,
  partyName,
  partyDisplayName,
  partyCurrency,
  outstandingBalance,
  currencyBalances,
  onEdit,
  onDelete,
}: PartyTransactionsPaneProps) {
  const tVendors = useTranslations("vendors");
  const tCustomers = useTranslations("customers");
  const partyTypeLabel =
    partyType === "Supplier" ? tVendors("transactions") : tCustomers("transactions");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col gap-0 p-0" side="right">
        <SheetHeader className="sr-only">
          <SheetTitle>{partyDisplayName}</SheetTitle>
          <SheetDescription>
            {partyTypeLabel} — {partyName}
          </SheetDescription>
        </SheetHeader>

        <PartyDetailPanel
          partyType={partyType}
          partyName={partyName}
          partyDisplayName={partyDisplayName}
          partyCurrency={partyCurrency}
          outstandingBalance={outstandingBalance}
          currencyBalances={currencyBalances}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </SheetContent>
    </Sheet>
  );
}
