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
  ClipboardCheck,
  UserCheck,
  Factory,
  Clock,
  Zap,
  GitBranch,
  Settings,
  Box,
  PenTool,
  Layers,
  Timer,
  Monitor,
  Activity,
  Handshake,
  Tags,
  ShieldCheck,
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
import { useTranslations } from "next-intl";
import { usePermissions } from "@/hooks/use-permissions";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import { useEnabledModules } from "@/hooks/use-enabled-modules";
import { isSidebarGroupEnabled } from "@/lib/module-groups";
import type { CapabilityId } from "@/lib/permissions/capabilities";

const mainNav = [
  { tKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { tKey: "expense", href: "/expenses/new", icon: FileText, doctype: "Journal Entry" },
  { tKey: "fundTransfer", href: "/funds/transfer", icon: ArrowLeftRight, doctype: "Journal Entry" },
];

const masterDataNav = [
  { tKey: "products", href: "/products", icon: Package, doctype: "Item" },
  { tKey: "customers", href: "/customers", icon: Users, doctype: "Customer" },
  { tKey: "vendors", href: "/vendors", icon: Truck, doctype: "Supplier" },
  { tKey: "partners", href: "/partners", icon: Handshake, doctype: "Customer" },
  { tKey: "employees", href: "/employees", icon: UserCheck, doctype: "Employee" },
  { tKey: "priceLists", href: "/price-lists", icon: Tags, doctype: "Price List" },
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

const accountingNav = [
  { tKey: "banks", href: "/banks", icon: Landmark, doctype: "Account" },
  { tKey: "chartOfAccounts", href: "/chart-of-accounts", icon: BookOpen, doctype: "Account" },
];

const warehouseNav = [
  { tKey: "whDashboard", href: "/warehouse", icon: BarChart3 },
  { tKey: "whPicking", href: "/warehouse/picking", icon: Package },
  { tKey: "whStockCheck", href: "/warehouse/stock-check", icon: ClipboardCheck },
  { tKey: "whPacking", href: "/warehouse/packing", icon: PackageCheck },
  { tKey: "whInvoicing", href: "/warehouse/invoicing", icon: FileText },
];

const factoryNav: NavItem[] = [
  { tKey: "oeeDashboard", href: "/factory", icon: Box, capability: "production.read", scopeDim: "line" },
  { tKey: "layoutEditor", href: "/factory/editor", icon: PenTool, capability: "lines.manage", scopeDim: "line" },
];

const oeeNav: NavItem[] = [
  { tKey: "mfgDashboard", href: "/manufacturing", icon: BarChart3, capability: "dashboard.read" },
  { tKey: "production", href: "/manufacturing/production", icon: Factory, capability: "production.read", scopeDim: "line" },
  { tKey: "downtime", href: "/manufacturing/downtime", icon: Clock, capability: "downtime.read", scopeDim: "line" },
  { tKey: "energy", href: "/manufacturing/energy", icon: Zap, capability: "energy.read" },
  { tKey: "mfgProducts", href: "/manufacturing/products", icon: Package, capability: "product.read" },
  { tKey: "mfgLines", href: "/manufacturing/lines", icon: GitBranch, capability: "lines.manage", scopeDim: "line" },
  { tKey: "mfgSettings", href: "/manufacturing/settings", icon: Settings, capability: "settings.read" },
];

const manufacturingNav = [
  { tKey: "mfgErpDashboard", href: "/manufacturing/dashboard", icon: Activity },
  { tKey: "workOrders", href: "/manufacturing/work-orders", icon: ClipboardList },
  { tKey: "bom", href: "/manufacturing/bom", icon: Layers },
  { tKey: "jobCards", href: "/manufacturing/job-cards", icon: Timer },
  { tKey: "workstations", href: "/manufacturing/workstations", icon: Monitor },
];

const adminNav: NavItem[] = [
  { tKey: "settings", href: "/settings", icon: Settings },
  { tKey: "permissions", href: "/settings/permissions", icon: ShieldCheck, capability: "platform.admin" },
];

const reportNav = [
  { tKey: "sales", href: "/reports/sales", icon: TrendingUp },
  { tKey: "profitLoss", href: "/reports/profit-loss", icon: BarChart3 },
  { tKey: "balanceSheet", href: "/reports/balance-sheet", icon: Scale },
  { tKey: "trialBalance", href: "/reports/trial-balance", icon: FileSpreadsheet },
  { tKey: "cashFlow", href: "/reports/cash-flow", icon: Banknote },
  { tKey: "accountsReceivable", href: "/reports/accounts-receivable", icon: ArrowDownRight },
  { tKey: "customerBalanceSummary", href: "/reports/customer-balance-summary", icon: Users },
  { tKey: "accountsPayable", href: "/reports/accounts-payable", icon: ArrowUpRight },
  { tKey: "generalLedger", href: "/reports/general-ledger", icon: FileSearch },
];

type NavItem = {
  tKey: string;
  href: string;
  icon: React.ComponentType;
  disabled?: boolean;
  doctype?: string;
  capability?: CapabilityId;
  scopeDim?: "line" | "warehouse" | "company";
};

function NavGroup({ labelKey, items }: { labelKey: string; items: NavItem[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { isLoading, canRead } = usePermissions();
  const { data: myPerms, isLoading: grantsLoading } = useMyPermissions();

  const hasCapability = (item: NavItem): boolean => {
    if (!item.capability) return true;
    if (myPerms.isSuperuser) return true;
    if (!myPerms.capabilities.has(item.capability)) return false;
    if (!item.scopeDim) return true;
    const scope = myPerms.allowedScopes[item.scopeDim];
    if (!scope || scope.size === 0) return false;
    return true;
  };

  // While loading, show all items to avoid a flash of empty sidebar
  const visibleItems =
    isLoading || grantsLoading
      ? items
      : items.filter(
          (item) => (!item.doctype || canRead(item.doctype)) && hasCapability(item),
        );

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
        {isSidebarGroupEnabled("accounting", enabledModules) && (
          <NavGroup labelKey="accounting" items={accountingNav} />
        )}
        {isSidebarGroupEnabled("warehouse", enabledModules) && (
          <NavGroup labelKey="warehouse" items={warehouseNav} />
        )}
        {isSidebarGroupEnabled("factory", enabledModules) && (
          <NavGroup labelKey="factory" items={factoryNav} />
        )}
        {isSidebarGroupEnabled("manufacturing", enabledModules) && (
          <>
            <NavGroup labelKey="oee" items={oeeNav} />
            <NavGroup labelKey="manufacturing" items={manufacturingNav} />
          </>
        )}
        {isSidebarGroupEnabled("reports", enabledModules) && (
          <NavGroup labelKey="reports" items={reportNav} />
        )}
        <NavGroup labelKey="admin" items={adminNav} />
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60" />
    </Sidebar>
  );
}
