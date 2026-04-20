"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { getAssets } from "@/actions/assets";
import { formatNumber, formatDate } from "@/lib/formatters";
import { calculateDepreciation } from "@/lib/utils/depreciation";
import type { Asset } from "@/types/asset";

export default function AssetsPage() {
  const t = useTranslations("assets");
  const [search, setSearch] = useState("");

  const { data: result, isLoading } = useQuery({
    queryKey: ["assets", search],
    queryFn: () => getAssets(search || undefined),
  });

  const assets = result?.success ? result.data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/assets/new">
            <Plus className="mr-1.5 h-4 w-4" />
            {t("newAsset")}
          </Link>
        </Button>
      </div>

      <Input
        placeholder={t("searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noAssets")}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("assetName")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead>{t("purchaseDate")}</TableHead>
                <TableHead className="text-right">{t("bookValue")}</TableHead>
                <TableHead className="text-right">{t("monthlyDep")}</TableHead>
                <TableHead>{t("assetStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => {
                const dep = calculateDepreciation(asset as Asset);
                return (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Link
                        href={`/assets/${asset.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {asset.assetCode}
                      </Link>
                    </TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{asset.category ?? "—"}</TableCell>
                    <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                    <TableCell className="text-right">{formatNumber(dep.bookValue)}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(dep.monthlyDepreciation)}
                    </TableCell>
                    <TableCell>
                      <AssetStatusBadge status={asset.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
