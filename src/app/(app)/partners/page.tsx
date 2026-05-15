"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Handshake, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanyStore } from "@/stores/company-store";
import { usePartnersList } from "@/lib/api/partners";
import { NetBalanceBadge } from "@/components/partners/net-balance-badge";
import { LinkPartnerDialog } from "@/components/partners/link-partner-dialog";
import { formatNumber } from "@/lib/formatters";

export default function PartnersPage() {
  const t = useTranslations("partners");
  const router = useRouter();
  const { company } = useCompanyStore();
  const { data: partners, isLoading } = usePartnersList(company);
  const [search, setSearch] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  const filtered = (partners ?? []).filter(
    (p) =>
      !search ||
      p.companyName.toLowerCase().includes(search.toLowerCase()) ||
      p.taxId?.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Handshake className="size-7" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setLinkOpen(true)}>
          <Plus className="mr-2 size-4" />
          {t("linkPartner")}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-[280px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={`${t("searchByInn")}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} {t("title").toLowerCase()}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Handshake className="size-12 mx-auto mb-4 opacity-30" />
          <p>{t("noPartners")}</p>
          <p className="text-sm mt-1">{t("linkFirst")}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("title")}</TableHead>
                <TableHead>INN</TableHead>
                <TableHead className="text-right">{t("receivable")}</TableHead>
                <TableHead className="text-right">{t("payable")}</TableHead>
                <TableHead className="text-right">{t("netBalance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/partners/${encodeURIComponent(p.customerId)}`)}
                >
                  <TableCell className="font-medium">{p.companyName}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {p.taxId || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">
                    {formatNumber(p.receivable)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                    {formatNumber(p.payable)}
                  </TableCell>
                  <TableCell className="text-right">
                    <NetBalanceBadge
                      netBalance={p.netBalance}
                      netDirection={p.netDirection}
                      currency={p.currency}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LinkPartnerDialog open={linkOpen} onOpenChange={setLinkOpen} />
    </div>
  );
}
