"use client";

import { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  Landmark,
  Banknote,
  Receipt,
  FileText,
  Warehouse,
  Calculator,
  TrendingDown,
  Coins,
  CreditCard,
  PiggyBank,
  Scale,
  ArrowRightLeft,
  BadgeDollarSign,
  CircleDollarSign,
  Building2,
  HandCoins,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { OpeningBalanceDialog } from "@/components/accounts/opening-balance-dialog";
import {
  useCOATree,
  useCurrencyMap,
  useDeleteAccount,
  type COATreeNode,
} from "@/hooks/use-accounts";
import type { CurrencyInfo } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import type { COAAccountListItem } from "@/types/account";

interface AccountTypeStyle {
  icon: LucideIcon;
  color: string; // Tailwind text color
  bg: string; // Tailwind bg for pill
}

const ACCOUNT_TYPE_STYLES: Record<string, AccountTypeStyle> = {
  Bank: {
    icon: Landmark,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  Cash: {
    icon: Banknote,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  Savings: {
    icon: PiggyBank,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  Receivable: {
    icon: Receipt,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  Payable: {
    icon: FileText,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
  },
  Stock: {
    icon: Warehouse,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/40",
  },
  "Fixed Asset": {
    icon: Building2,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/40",
  },
  "Capital Work in Progress": {
    icon: Building2,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/40",
  },
  Tax: {
    icon: Calculator,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
  },
  Depreciation: {
    icon: TrendingDown,
    color: "text-gray-500 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800/40",
  },
  "Accumulated Depreciation": {
    icon: TrendingDown,
    color: "text-gray-500 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800/40",
  },
  "Cost of Goods Sold": {
    icon: Coins,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
  },
  Expense: {
    icon: CreditCard,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
  },
  Income: {
    icon: BadgeDollarSign,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/40",
  },
  Chargeable: {
    icon: BadgeDollarSign,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/40",
  },
  Equity: {
    icon: Scale,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  Temporary: {
    icon: ArrowRightLeft,
    color: "text-gray-500 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800/40",
  },
  "Round Off": {
    icon: CircleDollarSign,
    color: "text-gray-500 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800/40",
  },
  Payroll: {
    icon: HandCoins,
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-950/40",
  },
};

function matchesSearch(node: COATreeNode, search: string): boolean {
  const lower = search.toLowerCase();
  if (node.account.account_name.toLowerCase().includes(lower)) return true;
  if (node.account.name.toLowerCase().includes(lower)) return true;
  return node.children.some((child) => matchesSearch(child, lower));
}

function getSymbol(
  currencyCode: string,
  currencyMap: Map<string, CurrencyInfo> | undefined,
): string {
  return currencyMap?.get(currencyCode)?.symbol || currencyCode;
}

function balanceColor(value: number): string {
  if (value < 0) return "text-red-600 dark:text-red-400";
  if (value === 0) return "text-muted-foreground";
  return "text-foreground";
}

function BalanceCell({
  account,
  companyCurrency,
  currencyMap,
}: {
  account: COAAccountListItem;
  companyCurrency: string;
  currencyMap: Map<string, CurrencyInfo> | undefined;
}) {
  if (account.is_group) return null;
  if (account.balance === undefined) return null;

  const isForeign = account.account_currency !== companyCurrency;
  const accSymbol = getSymbol(account.account_currency, currencyMap);
  const bal = formatNumber(Math.abs(account.balance), 2);
  const sign = account.balance < 0 ? "−" : "";

  const href = `/ledger/${encodeURIComponent(account.name)}`;

  if (isForeign && account.balance_in_base_currency !== undefined) {
    const baseSymbol = getSymbol(companyCurrency, currencyMap);
    const baseBal = formatNumber(Math.abs(account.balance_in_base_currency), 2);
    const baseSign = account.balance_in_base_currency < 0 ? "−" : "";
    return (
      <Link href={href} className="tabular-nums whitespace-nowrap hover:underline cursor-pointer">
        <span className={cn("font-medium", balanceColor(account.balance))}>
          {sign}
          {bal} {accSymbol}
        </span>
        <span className={cn("text-xs ml-1", balanceColor(account.balance_in_base_currency))}>
          / {baseSign}
          {baseBal} {baseSymbol}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "tabular-nums whitespace-nowrap font-medium hover:underline cursor-pointer",
        balanceColor(account.balance),
      )}
    >
      {sign}
      {bal} {accSymbol}
    </Link>
  );
}

const ROW_HEIGHT = 40;

interface FlatRow {
  node: COATreeNode;
  depth: number;
}

function flattenTree(
  nodes: COATreeNode[],
  collapsed: Set<string>,
  search: string,
  depth = 0,
): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const node of nodes) {
    if (search && !matchesSearch(node, search)) continue;
    rows.push({ node, depth });
    if (node.children.length > 0 && !collapsed.has(node.account.name)) {
      rows.push(...flattenTree(node.children, collapsed, search, depth + 1));
    }
  }
  return rows;
}

function VirtualizedCOATable({
  tree,
  isLoading,
  collapsed,
  search,
  scrollRef,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
  onOpeningBalance,
  companyCurrency,
  currencyMap,
}: {
  tree: COATreeNode[];
  isLoading: boolean;
  collapsed: Set<string>;
  search: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onToggle: (name: string) => void;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
  onAddChild: (parentName: string) => void;
  onOpeningBalance: (account: COAAccountListItem) => void;
  companyCurrency: string;
  currencyMap: Map<string, CurrencyInfo> | undefined;
}) {
  const flatRows = useMemo(() => flattenTree(tree, collapsed, search), [tree, collapsed, search]);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading accounts...
        </div>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No accounts found
        </div>
      </div>
    );
  }

  const gridCols = "grid-cols-[1fr_11rem_13rem]";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Sticky header — shares same grid template as body rows */}
      <div className={cn("grid border-b bg-muted/50", gridCols)}>
        <div className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Account
        </div>
        <div className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Type
        </div>
        <div className="py-2.5 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Balance
        </div>
      </div>

      {/* Virtualized scrollable body */}
      <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const { node, depth } = flatRows[virtualRow.index];
            return (
              <div
                key={node.account.name}
                className={cn(
                  "grid group transition-colors",
                  gridCols,
                  virtualRow.index % 2 === 0 ? "bg-background" : "bg-muted",
                  "hover:bg-accent/50",
                )}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Account name */}
                <div
                  className="py-2 pr-2 text-sm min-w-0"
                  style={{ paddingLeft: `${depth * 24 + 12}px` }}
                >
                  <div className="flex items-center gap-1.5">
                    {node.children.length > 0 ? (
                      <button
                        onClick={() => onToggle(node.account.name)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted"
                      >
                        {collapsed.has(node.account.name) ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" />
                    )}
                    <span className={cn("truncate", node.account.is_group && "font-semibold")}>
                      {node.account.account_name}
                    </span>
                    <span
                      className="hidden group-hover:inline-flex items-center gap-0.5 ml-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {node.account.is_group === 1 && (
                        <button
                          className="text-[11px] text-primary hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10"
                          onClick={() => onAddChild(node.account.name)}
                        >
                          + Child
                        </button>
                      )}
                      <button
                        className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
                        onClick={() => onEdit(node.account.name)}
                      >
                        Edit
                      </button>
                      {!node.account.is_group && (
                        <button
                          className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
                          onClick={() => onOpeningBalance(node.account)}
                        >
                          Opening
                        </button>
                      )}
                      <button
                        className="text-[11px] text-destructive hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10"
                        onClick={() => onDelete(node.account.name)}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </div>

                {/* Type */}
                <div className="py-2 px-3 text-sm whitespace-nowrap flex items-center">
                  {!node.account.is_group && node.account.account_type ? (
                    (() => {
                      const style = ACCOUNT_TYPE_STYLES[node.account.account_type];
                      if (!style)
                        return (
                          <span className="text-muted-foreground">{node.account.account_type}</span>
                        );
                      const Icon = style.icon;
                      return (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                            style.color,
                            style.bg,
                          )}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          {node.account.account_type}
                        </span>
                      );
                    })()
                  ) : node.account.is_group ? null : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                {/* Balance */}
                <div className="py-2 px-3 text-sm text-right flex items-center justify-end">
                  <BalanceCell
                    account={node.account}
                    companyCurrency={companyCurrency}
                    currencyMap={currencyMap}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ChartOfAccountsPage() {
  const { company, currencyCode } = useCompanyStore();
  const { data: tree = [], isLoading, isFetching } = useCOATree(company, currencyCode);
  const { data: currencyMap } = useCurrencyMap();

  const deleteAccount = useDeleteAccount();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editAccountName, setEditAccountName] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [addChildParent, setAddChildParent] = useState<string | null>(null);
  const [openingBalanceAccount, setOpeningBalanceAccount] = useState<COAAccountListItem | null>(
    null,
  );

  function handleToggle(name: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function collapseAll() {
    const groups = new Set<string>();
    function collect(nodes: COATreeNode[]) {
      for (const n of nodes) {
        if (n.children.length > 0) {
          groups.add(n.account.name);
          collect(n.children);
        }
      }
    }
    collect(tree);
    setCollapsed(groups);
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteAccount.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success("Account deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Chart of Accounts</h1>
          {isFetching && !isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Account
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      <VirtualizedCOATable
        tree={tree}
        isLoading={isLoading}
        collapsed={collapsed}
        search={search}
        scrollRef={scrollRef}
        onToggle={handleToggle}
        onEdit={setEditAccountName}
        onDelete={setDeleteTarget}
        onAddChild={setAddChildParent}
        onOpeningBalance={setOpeningBalanceAccount}
        companyCurrency={currencyCode}
        currencyMap={currencyMap}
      />

      <AccountFormDialog mode="general" open={showNewDialog} onOpenChange={setShowNewDialog} />

      <AccountFormDialog
        mode="general"
        defaultParent={addChildParent ?? undefined}
        open={!!addChildParent}
        onOpenChange={(v) => !v && setAddChildParent(null)}
      />

      <AccountFormDialog
        mode="general"
        editName={editAccountName ?? undefined}
        open={!!editAccountName}
        onOpenChange={(v) => !v && setEditAccountName(null)}
      />

      {openingBalanceAccount && (
        <OpeningBalanceDialog
          account={openingBalanceAccount}
          open={!!openingBalanceAccount}
          onOpenChange={(v) => !v && setOpeningBalanceAccount(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Account"
        description={`Delete "${deleteTarget}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteAccount.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
