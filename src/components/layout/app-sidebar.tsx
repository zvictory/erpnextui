"use client";

import { useMemo } from "react";
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
  Calculator,
  HardDrive,
  Wrench,
  CalendarCheck,
  Hammer,
  AlertTriangle,
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
import type { CapabilityId, BuiltinCapabilityId } from "@/lib/permissions/capabilities";
import { ALL_NAV_CAPABILITY_IDS } from "@/lib/permissions/nav-items";

const mainNav: NavItem[] = [
  { tKey: "dashboard", href: "/dashboard", icon: LayoutDashboard, navCapability: "nav.dashboard" },
  { tKey: "expense", href: "/expenses/new", icon: FileText, doctype: "Journal Entry", navCapability: "nav.expense" },
  { tKey: "fundTransfer", href: "/funds/transfer", icon: ArrowLeftRight, doctype: "Journal Entry", navCapability: "nav.fundTransfer" },
];

const masterDataNav: NavItem[] = [
  { tKey: "products", href: "/products", icon: Package, doctype: "Item", navCapability: "nav.products" },
  { tKey: "customers", href: "/customers", icon: Users, doctype: "Customer", navCapability: "nav.customers" },
  { tKey: "vendors", href: "/vendors", icon: Truck, doctype: "Supplier", navCapability: "nav.vendors" },
  { tKey: "partners", href: "/partners", icon: Handshake, doctype: "Customer", navCapability: "nav.partners" },
  { tKey: "employees", href: "/employees", icon: UserCheck, doctype: "Employee", navCapability: "nav.employees" },
  { tKey: "priceLists", href: "/price-lists", icon: Tags, doctype: "Price List", navCapability: "nav.priceLists" },
];

const transactionNav: NavItem[] = [
  { tKey: "quotations", href: "/quotations", icon: FileCheck, doctype: "Quotation", navCapability: "nav.quotations" },
  { tKey: "salesOrders", href: "/sales-orders", icon: ShoppingCart, doctype: "Sales Order", navCapability: "nav.salesOrders" },
  { tKey: "deliveryNotes", href: "/delivery-notes", icon: PackageCheck, doctype: "Delivery Note", navCapability: "nav.deliveryNotes" },
  { tKey: "salesInvoices", href: "/sales-invoices", icon: FileOutput, doctype: "Sales Invoice", navCapability: "nav.salesInvoices" },
  { tKey: "purchaseOrders", href: "/purchase-orders", icon: ClipboardList, doctype: "Purchase Order", navCapability: "nav.purchaseOrders" },
  { tKey: "purchaseInvoices", href: "/purchase-invoices", icon: FileInput, doctype: "Purchase Invoice", navCapability: "nav.purchaseInvoices" },
  { tKey: "payments", href: "/payments", icon: CreditCard, doctype: "Payment Entry", navCapability: "nav.payments" },
];

const stockNav: NavItem[] = [
  { tKey: "warehouses", href: "/warehouses", icon: Warehouse, doctype: "Warehouse", navCapability: "nav.warehouses" },
  { tKey: "stockEntries", href: "/stock-entries", icon: PackagePlus, doctype: "Stock Entry", navCapability: "nav.stockEntries" },
  { tKey: "stockLedger", href: "/stock-ledger", icon: ScrollText, navCapability: "nav.stockLedger" },
];

const accountingNav: NavItem[] = [
  { tKey: "banks", href: "/banks", icon: Landmark, doctype: "Account", navCapability: "nav.banks" },
  { tKey: "chartOfAccounts", href: "/chart-of-accounts", icon: BookOpen, doctype: "Account", navCapability: "nav.chartOfAccounts" },
];

const warehouseNav: NavItem[] = [
  { tKey: "whDashboard", href: "/warehouse", icon: BarChart3, navCapability: "nav.whDashboard" },
  { tKey: "whPicking", href: "/warehouse/picking", icon: Package, navCapability: "nav.whPicking" },
  { tKey: "whStockCheck", href: "/warehouse/stock-check", icon: ClipboardCheck, navCapability: "nav.whStockCheck" },
  { tKey: "whPacking", href: "/warehouse/packing", icon: PackageCheck, navCapability: "nav.whPacking" },
  { tKey: "whInvoicing", href: "/warehouse/invoicing", icon: FileText, navCapability: "nav.whInvoicing" },
];

const factoryNav: NavItem[] = [
  { tKey: "oeeDashboard", href: "/factory", icon: Box, capability: "production.read", scopeDim: "line", navCapability: "nav.oeeDashboard" },
  { tKey: "layoutEditor", href: "/factory/editor", icon: PenTool, capability: "lines.manage", scopeDim: "line", navCapability: "nav.layoutEditor" },
];

const oeeNav: NavItem[] = [
  { tKey: "mfgDashboard", href: "/manufacturing", icon: BarChart3, capability: "dashboard.read", navCapability: "nav.mfgDashboard" },
  { tKey: "production", href: "/manufacturing/production", icon: Factory, capability: "production.read", scopeDim: "line", navCapability: "nav.production" },
  { tKey: "downtime", href: "/manufacturing/downtime", icon: Clock, capability: "downtime.read", scopeDim: "line", navCapability: "nav.downtime" },
  { tKey: "energy", href: "/manufacturing/energy", icon: Zap, capability: "energy.read", navCapability: "nav.energy" },
  { tKey: "mfgProducts", href: "/manufacturing/products", icon: Package, capability: "product.read", navCapability: "nav.mfgProducts" },
  { tKey: "mfgLines", href: "/manufacturing/lines", icon: GitBranch, capability: "lines.manage", scopeDim: "line", navCapability: "nav.mfgLines" },
  { tKey: "mfgSettings", href: "/manufacturing/settings", icon: Settings, capability: "settings.read", navCapability: "nav.mfgSettings" },
];

const manufacturingNav: NavItem[] = [
  { tKey: "mfgErpDashboard", href: "/manufacturing/dashboard", icon: Activity, navCapability: "nav.mfgErpDashboard" },
  { tKey: "workOrders", href: "/manufacturing/work-orders", icon: ClipboardList, navCapability: "nav.workOrders" },
  { tKey: "bom", href: "/manufacturing/bom", icon: Layers, navCapability: "nav.bom" },
  { tKey: "jobCards", href: "/manufacturing/job-cards", icon: Timer, navCapability: "nav.jobCards" },
  { tKey: "workstations", href: "/manufacturing/workstations", icon: Monitor, navCapability: "nav.workstations" },
  { tKey: "costingDashboard", href: "/manufacturing/costing-dashboard", icon: Calculator, navCapability: "nav.costingDashboard" },
  { tKey: "laborReport", href: "/manufacturing/labor-report", icon: Users, navCapability: "nav.laborReport" },
];

const assetMaintenanceNav: NavItem[] = [
  { tKey: "assets", href: "/assets", icon: HardDrive, navCapability: "nav.assets" },
  { tKey: "maintenanceDashboard", href: "/maintenance", icon: Wrench, navCapability: "nav.maintenanceDashboard" },
  { tKey: "maintenanceLogs", href: "/maintenance/logs", icon: ClipboardList, navCapability: "nav.maintenanceLogs" },
  { tKey: "maintenanceSchedule", href: "/maintenance/schedule", icon: CalendarCheck, navCapability: "nav.maintenanceSchedule" },
  { tKey: "spareParts", href: "/maintenance/spare-parts", icon: Hammer, navCapability: "nav.spareParts" },
];

const adminNav: NavItem[] = [
  { tKey: "settings", href: "/settings", icon: Settings, navCapability: "nav.settings" },
  { tKey: "permissions", href: "/settings/permissions", icon: ShieldCheck, capability: "platform.admin", navCapability: "nav.permissions" },
];

const reportNav: NavItem[] = [
  { tKey: "sales", href: "/reports/sales", icon: TrendingUp, navCapability: "nav.sales" },
  { tKey: "profitLoss", href: "/reports/profit-loss", icon: BarChart3, navCapability: "nav.profitLoss" },
  { tKey: "balanceSheet", href: "/reports/balance-sheet", icon: Scale, navCapability: "nav.balanceSheet" },
  { tKey: "trialBalance", href: "/reports/trial-balance", icon: FileSpreadsheet, navCapability: "nav.trialBalance" },
  { tKey: "cashFlow", href: "/reports/cash-flow", icon: Banknote, navCapability: "nav.cashFlow" },
  { tKey: "accountsReceivable", href: "/reports/accounts-receivable", icon: ArrowDownRight, navCapability: "nav.accountsReceivable" },
  { tKey: "customerBalanceSummary", href: "/reports/customer-balance-summary", icon: Users, navCapability: "nav.customerBalanceSummary" },
  { tKey: "accountsPayable", href: "/reports/accounts-payable", icon: ArrowUpRight, navCapability: "nav.accountsPayable" },
  { tKey: "generalLedger", href: "/reports/general-ledger", icon: FileSearch, navCapability: "nav.generalLedger" },
  { tKey: "currencyAudit", href: "/reports/currency-audit", icon: AlertTriangle, navCapability: "nav.currencyAudit" },
];

type NavItem = {
  tKey: string;
  href: string;
  icon: React.ComponentType;
  disabled?: boolean;
  doctype?: string;
  capability?: CapabilityId;
  scopeDim?: "line" | "warehouse" | "company";
  navCapability?: BuiltinCapabilityId;
};

function NavGroup({ labelKey, items }: { labelKey: string; items: NavItem[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { isLoading, canRead } = usePermissions();
  const { data: myPerms, isLoading: grantsLoading } = useMyPermissions();

  // Bootstrap detection: if the user has zero nav.* grants, fall back to old logic
  // so unmigrated users don't lose access.
  const hasAnyNavGrants = useMemo(() => {
    if (myPerms.isSuperuser) return true;
    for (const cap of myPerms.capabilities) {
      if (ALL_NAV_CAPABILITY_IDS.has(cap)) return true;
    }
    return false;
  }, [myPerms.capabilities, myPerms.isSuperuser]);

  const hasCapability = (item: NavItem): boolean => {
    if (!item.capability) return true;
    if (myPerms.isSuperuser) return true;
    if (!myPerms.capabilities.has(item.capability)) return false;
    if (!item.scopeDim) return true;
    const scope = myPerms.allowedScopes[item.scopeDim];
    if (!scope || scope.size === 0) return false;
    return true;
  };

  const hasNavAccess = (item: NavItem): boolean => {
    if (!item.navCapability) return true;
    if (myPerms.isSuperuser) return true;
    return myPerms.capabilities.has(item.navCapability);
  };

  // While loading, show all items to avoid a flash of empty sidebar.
  // Once loaded: if user has nav.* grants, use nav capability checks;
  // otherwise fall back to old doctype + capability logic (bootstrap).
  const visibleItems =
    isLoading || grantsLoading
      ? items
      : hasAnyNavGrants
        ? items.filter((item) => hasNavAccess(item))
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
        {isSidebarGroupEnabled("assetMaintenance", enabledModules) && (
          <NavGroup labelKey="assetMaintenance" items={assetMaintenanceNav} />
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
