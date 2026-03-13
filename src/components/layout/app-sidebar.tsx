"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  Package,
  Users,
  Truck,
  FileOutput,
  FileInput,
  CreditCard,
  TrendingUp,
  BarChart3,
  Scale,
  Landmark,
  BookOpen,
  PanelLeftClose,
  FileSpreadsheet,
  Banknote,
  ArrowDownRight,
  ArrowUpRight,
  FileSearch,
  ShoppingCart,
  ClipboardList,
  Warehouse,
  PackagePlus,
  ScrollText,
  FileCheck,
  PackageCheck,
  UserCheck,
  Barcode,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { usePermissions } from "@/hooks/use-permissions";
import { useSidebar } from "@/components/ui/sidebar";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { useEnabledModules } from "@/hooks/use-enabled-modules";
import { isSidebarGroupEnabled } from "@/lib/module-groups";

const mainNav = [
  { tKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { tKey: "expense", href: "/expenses/new", icon: FileText, doctype: "Journal Entry" },
  { tKey: "fundTransfer", href: "/funds/transfer", icon: ArrowLeftRight, doctype: "Journal Entry" },
];

const masterDataNav = [
  { tKey: "products", href: "/products", icon: Package, doctype: "Item" },
  { tKey: "customers", href: "/customers", icon: Users, doctype: "Customer" },
  { tKey: "vendors", href: "/vendors", icon: Truck, doctype: "Supplier" },
  { tKey: "employees", href: "/employees", icon: UserCheck, doctype: "Employee" },
];

const transactionNav = [
  { tKey: "quotations", href: "/quotations", icon: FileCheck, doctype: "Quotation" },
  { tKey: "salesOrders", href: "/sales-orders", icon: ShoppingCart, doctype: "Sales Order" },
  { tKey: "deliveryNotes", href: "/delivery-notes", icon: PackageCheck, doctype: "Delivery Note" },
  { tKey: "salesInvoices", href: "/sales-invoices", icon: FileOutput, doctype: "Sales Invoice" },
  {
    tKey: "purchaseOrders",
    href: "/purchase-orders",
    icon: ClipboardList,
    doctype: "Purchase Order",
  },
  {
    tKey: "purchaseInvoices",
    href: "/purchase-invoices",
    icon: FileInput,
    doctype: "Purchase Invoice",
  },
  { tKey: "payments", href: "/payments", icon: CreditCard, doctype: "Payment Entry" },
];

const stockNav = [
  { tKey: "warehouses", href: "/warehouses", icon: Warehouse, doctype: "Warehouse" },
  { tKey: "stockEntries", href: "/stock-entries", icon: PackagePlus, doctype: "Stock Entry" },
  { tKey: "stockLedger", href: "/stock-ledger", icon: ScrollText },
];

const serialTrackingNav = [
  { tKey: "serialNumbers", href: "/serial-numbers", icon: Barcode, doctype: "Serial No" },
];

const accountingNav = [
  { tKey: "banks", href: "/banks", icon: Landmark, doctype: "Account" },
  { tKey: "chartOfAccounts", href: "/chart-of-accounts", icon: BookOpen, doctype: "Account" },
];

const reportNav = [
  { tKey: "sales", href: "/reports/sales", icon: TrendingUp },
  { tKey: "profitLoss", href: "/reports/profit-loss", icon: BarChart3 },
  { tKey: "balanceSheet", href: "/reports/balance-sheet", icon: Scale },
  { tKey: "trialBalance", href: "/reports/trial-balance", icon: FileSpreadsheet },
  { tKey: "cashFlow", href: "/reports/cash-flow", icon: Banknote },
  { tKey: "accountsReceivable", href: "/reports/accounts-receivable", icon: ArrowDownRight },
  { tKey: "accountsPayable", href: "/reports/accounts-payable", icon: ArrowUpRight },
  { tKey: "generalLedger", href: "/reports/general-ledger", icon: FileSearch },
];

type NavItem = {
  tKey: string;
  href: string;
  icon: React.ComponentType;
  disabled?: boolean;
  doctype?: string;
};

function NavGroup({ labelKey, items }: { labelKey: string; items: NavItem[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { isLoading, canRead } = usePermissions();

  // While loading, show all items to avoid a flash of empty sidebar
  const visibleItems = isLoading
    ? items
    : items.filter((item) => !item.doctype || canRead(item.doctype));

  if (visibleItems.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t(`groups.${labelKey}`)}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.tKey}>
              {item.disabled ? (
                <SidebarMenuButton disabled>
                  <item.icon />
                  <span>{t(item.tKey)}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{t(item.tKey)}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function AutoCollapseToggle() {
  const t = useTranslations("nav");
  const { state } = useSidebar();
  const autoCollapse = useUISettingsStore((s) => s.autoCollapseSidebar);
  const setAutoCollapse = useUISettingsStore((s) => s.setAutoCollapseSidebar);
  const isCollapsed = state === "collapsed";

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton onClick={() => setAutoCollapse(!autoCollapse)}>
              <PanelLeftClose className={autoCollapse ? "text-primary" : "text-muted-foreground"} />
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right">{t("autoCollapseTooltip")}</TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-sm text-muted-foreground">{t("autoCollapse")}</span>
        <Switch checked={autoCollapse} onCheckedChange={setAutoCollapse} />
      </div>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const enabledModules = useEnabledModules();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Scale className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Stable ERP</span>
                  <span className="text-xs text-muted-foreground">Finance</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup labelKey="main" items={mainNav} />
        {isSidebarGroupEnabled("masterData", enabledModules) && (
          <NavGroup labelKey="masterData" items={masterDataNav} />
        )}
        {isSidebarGroupEnabled("transactions", enabledModules) && (
          <NavGroup labelKey="transactions" items={transactionNav} />
        )}
        {isSidebarGroupEnabled("stock", enabledModules) && (
          <NavGroup labelKey="stock" items={stockNav} />
        )}
        {isSidebarGroupEnabled("serialTracking", enabledModules) && (
          <NavGroup labelKey="serialTracking" items={serialTrackingNav} />
        )}
        {isSidebarGroupEnabled("accounting", enabledModules) && (
          <NavGroup labelKey="accounting" items={accountingNav} />
        )}
        {isSidebarGroupEnabled("reports", enabledModules) && (
          <NavGroup labelKey="reports" items={reportNav} />
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60">
        <SidebarMenu>
          <AutoCollapseToggle />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
