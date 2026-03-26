"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSerialNumbersByItem,
  useSerialNumberCountByItem,
  useUpdateSerialNumber,
} from "@/hooks/use-serial-numbers";
import { useCompanyStore } from "@/stores/company-store";

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  Active: "default",
  Delivered: "secondary",
  Expired: "outline",
  Inactive: "outline",
};

interface EditingState {
  serialName: string;
  imei1: string;
  imei2: string;
}

interface ProductSerialNumbersTableProps {
  itemCode: string;
}

export function ProductSerialNumbersTable({ itemCode }: ProductSerialNumbersTableProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const { company } = useCompanyStore();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [search]);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const { data: serials = [], isLoading } = useSerialNumbersByItem(
    itemCode,
    company,
    page,
    debouncedSearch,
    "creation desc",
  );
  const { data: totalCount = 0 } = useSerialNumberCountByItem(itemCode, company, debouncedSearch);
  const updateSerial = useUpdateSerialNumber();

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function startEditing(name: string, imei1: string, imei2: string) {
    setEditing({ serialName: name, imei1, imei2 });
  }

  function handleSave() {
    if (!editing) return;
    updateSerial.mutate(
      {
        name: editing.serialName,
        data: { custom_imei_1: editing.imei1, custom_imei_2: editing.imei2 },
      },
      {
        onSuccess: () => {
          toast.success(t("imeiSaved"));
          setEditing(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">
            {t("serialNumbersSection", { count: totalCount })}
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("searchSerials")}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : serials.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">{t("noSerials")}</p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("serialNo")}</TableHead>
                    <TableHead>{t("imei1")}</TableHead>
                    <TableHead>{t("imei2")}</TableHead>
                    <TableHead>{t("warehouse")}</TableHead>
                    <TableHead>{t("serialStatus")}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serials.map((row) => {
                    const isEditing = editing?.serialName === row.name;
                    return (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editing.imei1}
                              onChange={(e) => setEditing({ ...editing, imei1: e.target.value })}
                              className="h-8 font-mono text-xs"
                              maxLength={20}
                            />
                          ) : (
                            <span
                              className="cursor-pointer font-mono text-xs hover:underline"
                              onClick={() =>
                                startEditing(row.name, row.custom_imei_1 || "", row.custom_imei_2 || "")
                              }
                            >
                              {row.custom_imei_1 || "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editing.imei2}
                              onChange={(e) => setEditing({ ...editing, imei2: e.target.value })}
                              className="h-8 font-mono text-xs"
                              maxLength={20}
                            />
                          ) : (
                            <span
                              className="cursor-pointer font-mono text-xs hover:underline"
                              onClick={() =>
                                startEditing(row.name, row.custom_imei_1 || "", row.custom_imei_2 || "")
                              }
                            >
                              {row.custom_imei_2 || "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{row.warehouse || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isEditing && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={handleSave}
                                disabled={updateSerial.isPending}
                              >
                                {t("saveImei")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditing(null)}
                              >
                                ✕
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {tc("previous")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {tc("next")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
