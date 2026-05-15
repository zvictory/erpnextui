"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  ArrowDownLeft,
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
  CalendarDays,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/route-prefetch";
import { useCompanyStore } from "@/stores/company-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import { useEnabledModules } from "@/hooks/use-enabled-modules";
import { isSidebarGroupEnabled } from "@/lib/module-groups";
import type { CapabilityId, BuiltinCapabilityId } from "@/lib/permissions/capabilities";
import { ALL_NAV_CAPABILITY_IDS } from "@/lib/permissions/nav-items";
import { CompanySwitcher } from "@/components/layout/company-switcher";
import { UserMenu } from "@/components/layout/user-menu";

const COLLAPSED_W = 56;
const EXPANDED_W = 240;
const SPRING = { type: "spring" as const, stiffness: 320, damping: 32 };

type NavItem = {
  tKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  doctype?: string;
  capability?: CapabilityId;
  scopeDim?: "line" | "warehouse" | "company";
  navCapability?: BuiltinCapabilityId;
};

const mainNav: NavItem[] = [
  { tKey: "dashboard", href: "/dashboard", icon: LayoutDashboard, navCapability: "nav.dashboard" },
  {
    tKey: "expense",
    href: "/expenses/new",
    icon: FileText,
    doctype: "Journal Entry",
    navCapability: "nav.expense",
  },
  {
    tKey: "income",
    href: "/incomes/new",
    icon: ArrowDownLeft,
    doctype: "Journal Entry",
    navCapability: "nav.income",
  },
  {
    tKey: "fundTransfer",
    href: "/funds/transfer",
    icon: ArrowLeftRight,
    doctype: "Journal Entry",
    navCapability: "nav.fundTransfer",
  },
];

const masterDataNav: NavItem[] = [
  {
    tKey: "products",
    href: "/products",
    icon: Package,
    doctype: "Item",
    navCapability: "nav.products",
  },
  {
    tKey: "customers",
    href: "/customers",
    icon: Users,
    doctype: "Customer",
    navCapability: "nav.customers",
  },
  {
    tKey: "vendors",
    href: "/vendors",
    icon: Truck,
    doctype: "Supplier",
    navCapability: "nav.vendors",
  },
  {
    tKey: "partners",
    href: "/partners",
    icon: Handshake,
    doctype: "Customer",
    navCapability: "nav.partners",
  },
  {
    tKey: "employees",
    href: "/employees",
    icon: UserCheck,
    doctype: "Employee",
    navCapability: "nav.employees",
  },
  {
    tKey: "attendance",
    href: "/employees/attendance",
    icon: CalendarDays,
    doctype: "Employee",
    navCapability: "nav.employees",
  },
  {
    tKey: "priceLists",
    href: "/price-lists",
    icon: Tags,
    doctype: "Price List",
    navCapability: "nav.priceLists",
  },
];

const transactionNav: NavItem[] = [
  {
    tKey: "quotations",
    href: "/quotations",
    icon: FileCheck,
    doctype: "Quotation",
    navCapability: "nav.quotations",
  },
  {
    tKey: "salesOrders",
    href: "/sales-orders",
    icon: ShoppingCart,
    doctype: "Sales Order",
    navCapability: "nav.salesOrders",
  },
  {
    tKey: "deliveryNotes",
    href: "/delivery-notes",
    icon: PackageCheck,
    doctype: "Delivery Note",
    navCapability: "nav.deliveryNotes",
  },
  {
    tKey: "salesInvoices",
    href: "/sales-invoices",
    icon: FileOutput,
    doctype: "Sales Invoice",
    navCapability: "nav.salesInvoices",
  },
  {
    tKey: "purchaseOrders",
    href: "/purchase-orders",
    icon: ClipboardList,
    doctype: "Purchase Order",
    navCapability: "nav.purchaseOrders",
  },
  {
    tKey: "purchaseInvoices",
    href: "/purchase-invoices",
    icon: FileInput,
    doctype: "Purchase Invoice",
    navCapability: "nav.purchaseInvoices",
  },
  {
    tKey: "payments",
    href: "/payments",
    icon: CreditCard,
    doctype: "Payment Entry",
    navCapability: "nav.payments",
  },
];

const stockNav: NavItem[] = [
  {
    tKey: "warehouses",
    href: "/warehouses",
    icon: Warehouse,
    doctype: "Warehouse",
    navCapability: "nav.warehouses",
  },
  {
    tKey: "stockEntries",
    href: "/stock-entries",
    icon: PackagePlus,
    doctype: "Stock Entry",
    navCapability: "nav.stockEntries",
  },
  {
    tKey: "stockLedger",
    href: "/stock-ledger",
    icon: ScrollText,
    navCapability: "nav.stockLedger",
  },
];

const accountingNav: NavItem[] = [
  { tKey: "banks", href: "/banks", icon: Landmark, doctype: "Account", navCapability: "nav.banks" },
  {
    tKey: "chartOfAccounts",
    href: "/chart-of-accounts",
    icon: BookOpen,
    doctype: "Account",
    navCapability: "nav.chartOfAccounts",
  },
];

const warehouseNav: NavItem[] = [
  { tKey: "whDashboard", href: "/warehouse", icon: BarChart3, navCapability: "nav.whDashboard" },
  { tKey: "whPicking", href: "/warehouse/picking", icon: Package, navCapability: "nav.whPicking" },
  {
    tKey: "whStockCheck",
    href: "/warehouse/stock-check",
    icon: ClipboardCheck,
    navCapability: "nav.whStockCheck",
  },
  {
    tKey: "whPacking",
    href: "/warehouse/packing",
    icon: PackageCheck,
    navCapability: "nav.whPacking",
  },
  {
    tKey: "whInvoicing",
    href: "/warehouse/invoicing",
    icon: FileText,
    navCapability: "nav.whInvoicing",
  },
];

const factoryNav: NavItem[] = [
  {
    tKey: "oeeDashboard",
    href: "/factory",
    icon: Box,
    capability: "production.read",
    scopeDim: "line",
    navCapability: "nav.oeeDashboard",
  },
  {
    tKey: "layoutEditor",
    href: "/factory/editor",
    icon: PenTool,
    capability: "lines.manage",
    scopeDim: "line",
    navCapability: "nav.layoutEditor",
  },
];

const oeeNav: NavItem[] = [
  {
    tKey: "mfgDashboard",
    href: "/manufacturing",
    icon: BarChart3,
    capability: "dashboard.read",
    navCapability: "nav.mfgDashboard",
  },
  {
    tKey: "production",
    href: "/manufacturing/production",
    icon: Factory,
    capability: "production.read",
    scopeDim: "line",
    navCapability: "nav.production",
  },
  {
    tKey: "downtime",
    href: "/manufacturing/downtime",
    icon: Clock,
    capability: "downtime.read",
    scopeDim: "line",
    navCapability: "nav.downtime",
  },
  {
    tKey: "energy",
    href: "/manufacturing/energy",
    icon: Zap,
    capability: "energy.read",
    navCapability: "nav.energy",
  },
  {
    tKey: "mfgProducts",
    href: "/manufacturing/products",
    icon: Package,
    capability: "product.read",
    navCapability: "nav.mfgProducts",
  },
  {
    tKey: "mfgLines",
    href: "/manufacturing/lines",
    icon: GitBranch,
    capability: "lines.manage",
    scopeDim: "line",
    navCapability: "nav.mfgLines",
  },
  {
    tKey: "mfgSettings",
    href: "/manufacturing/settings",
    icon: Settings,
    capability: "settings.read",
    navCapability: "nav.mfgSettings",
  },
];

const manufacturingNav: NavItem[] = [
  {
    tKey: "mfgErpDashboard",
    href: "/manufacturing/dashboard",
    icon: Activity,
    navCapability: "nav.mfgErpDashboard",
  },
  {
    tKey: "workOrders",
    href: "/manufacturing/work-orders",
    icon: ClipboardList,
    navCapability: "nav.workOrders",
  },
  { tKey: "bom", href: "/manufacturing/bom", icon: Layers, navCapability: "nav.bom" },
  {
    tKey: "jobCards",
    href: "/manufacturing/job-cards",
    icon: Timer,
    navCapability: "nav.jobCards",
  },
  {
    tKey: "workstations",
    href: "/manufacturing/workstations",
    icon: Monitor,
    navCapability: "nav.workstations",
  },
  {
    tKey: "costingDashboard",
    href: "/manufacturing/costing-dashboard",
    icon: Calculator,
    navCapability: "nav.costingDashboard",
  },
  {
    tKey: "laborReport",
    href: "/manufacturing/labor-report",
    icon: Users,
    navCapability: "nav.laborReport",
  },
];

const assetMaintenanceNav: NavItem[] = [
  { tKey: "assets", href: "/assets", icon: HardDrive, navCapability: "nav.assets" },
  {
    tKey: "maintenanceDashboard",
    href: "/maintenance",
    icon: Wrench,
    navCapability: "nav.maintenanceDashboard",
  },
  {
    tKey: "maintenanceLogs",
    href: "/maintenance/logs",
    icon: ClipboardList,
    navCapability: "nav.maintenanceLogs",
  },
  {
    tKey: "maintenanceSchedule",
    href: "/maintenance/schedule",
    icon: CalendarCheck,
    navCapability: "nav.maintenanceSchedule",
  },
  {
    tKey: "spareParts",
    href: "/maintenance/spare-parts",
    icon: Hammer,
    navCapability: "nav.spareParts",
  },
];

const adminNav: NavItem[] = [
  { tKey: "settings", href: "/settings", icon: Settings, navCapability: "nav.settings" },
  {
    tKey: "permissions",
    href: "/settings/permissions",
    icon: ShieldCheck,
    capability: "platform.admin",
    navCapability: "nav.permissions",
  },
];

const reportNav: NavItem[] = [
  { tKey: "sales", href: "/reports/sales", icon: TrendingUp, navCapability: "nav.sales" },
  {
    tKey: "salesByItem",
    href: "/reports/sales-by-item",
    icon: Package,
    navCapability: "nav.salesByItem",
  },
  {
    tKey: "salesByCustomer",
    href: "/reports/sales-by-customer",
    icon: UserCheck,
    navCapability: "nav.salesByCustomer",
  },
  {
    tKey: "warehouseTransfers",
    href: "/reports/warehouse-transfers",
    icon: ArrowLeftRight,
    navCapability: "nav.warehouseTransfers",
  },
  {
    tKey: "salesAnalytics",
    href: "/reports/sales-analytics",
    icon: Activity,
    navCapability: "nav.salesAnalytics",
  },
  {
    tKey: "profitLoss",
    href: "/reports/profit-loss",
    icon: BarChart3,
    navCapability: "nav.profitLoss",
  },
  {
    tKey: "balanceSheet",
    href: "/reports/balance-sheet",
    icon: Scale,
    navCapability: "nav.balanceSheet",
  },
  {
    tKey: "trialBalance",
    href: "/reports/trial-balance",
    icon: FileSpreadsheet,
    navCapability: "nav.trialBalance",
  },
  { tKey: "cashFlow", href: "/reports/cash-flow", icon: Banknote, navCapability: "nav.cashFlow" },
  {
    tKey: "accountsReceivable",
    href: "/reports/accounts-receivable",
    icon: ArrowDownRight,
    navCapability: "nav.accountsReceivable",
  },
  {
    tKey: "customerBalanceSummary",
    href: "/reports/customer-balance-summary",
    icon: Users,
    navCapability: "nav.customerBalanceSummary",
  },
  {
    tKey: "accountsPayable",
    href: "/reports/accounts-payable",
    icon: ArrowUpRight,
    navCapability: "nav.accountsPayable",
  },
  {
    tKey: "generalLedger",
    href: "/reports/general-ledger",
    icon: FileSearch,
    navCapability: "nav.generalLedger",
  },
  {
    tKey: "currencyAudit",
    href: "/reports/currency-audit",
    icon: AlertTriangle,
    navCapability: "nav.currencyAudit",
  },
];

/**
 * Single-source-of-truth permission filter for all nav groups.
 * Bootstrap rule: zero `nav.*` grants → fall back to legacy doctype + capability checks
 * so unmigrated users don't lose access.
 */
function useNavFilter() {
  const { isLoading, canRead } = usePermissions();
  const { data: myPerms, isLoading: grantsLoading } = useMyPermissions();

  const hasAnyNavGrants = useMemo(() => {
    if (myPerms.isSuperuser) return true;
    for (const cap of myPerms.capabilities) {
      if (ALL_NAV_CAPABILITY_IDS.has(cap)) return true;
    }
    return false;
  }, [myPerms.capabilities, myPerms.isSuperuser]);

  return useMemo(() => {
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

    return (items: NavItem[]): NavItem[] => {
      if (isLoading || grantsLoading) return items;
      if (hasAnyNavGrants) return items.filter(hasNavAccess);
      return items.filter(
        (item) => (!item.doctype || canRead(item.doctype)) && hasCapability(item),
      );
    };
  }, [isLoading, grantsLoading, hasAnyNavGrants, myPerms, canRead]);
}

interface NavRowProps {
  item: NavItem;
  open: boolean;
  pathname: string;
  onPrefetch: (href: string) => void;
}

function NavRow({ item, open, pathname, onPrefetch }: NavRowProps) {
  const t = useTranslations("nav");
  const Icon = item.icon;
  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  const baseClass = cn(
    "flex h-9 items-center gap-3 rounded-md px-2 text-sm transition-colors",
    isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
    !isActive &&
      !item.disabled &&
      "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
    item.disabled && "opacity-40 pointer-events-none",
  );

  const label = (
    <motion.span
      animate={{ opacity: open ? 1 : 0 }}
      transition={SPRING}
      className="truncate whitespace-nowrap"
    >
      {t(item.tKey)}
    </motion.span>
  );

  if (item.disabled) {
    return (
      <li>
        <div className={baseClass} aria-disabled="true">
          <Icon className="size-4 shrink-0" />
          {label}
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        className={baseClass}
        aria-current={isActive ? "page" : undefined}
        onMouseEnter={() => onPrefetch(item.href)}
        onFocus={() => onPrefetch(item.href)}
      >
        <Icon className="size-4 shrink-0" />
        {label}
      </Link>
    </li>
  );
}

interface NavGroupProps {
  labelKey: string;
  items: NavItem[];
  open: boolean;
  pathname: string;
  onPrefetch: (href: string) => void;
}

function NavGroup({ labelKey, items, open, pathname, onPrefetch }: NavGroupProps) {
  const t = useTranslations("nav");

  if (items.length === 0) return null;

  return (
    <div className="pb-2">
      <motion.div
        animate={{ opacity: open ? 1 : 0 }}
        transition={SPRING}
        className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50"
      >
        {t(`groups.${labelKey}`)}
      </motion.div>
      <ul className="space-y-0.5 px-2">
        {items.map((item) => (
          <NavRow
            key={item.tKey}
            item={item}
            open={open}
            pathname={pathname}
            onPrefetch={onPrefetch}
          />
        ))}
      </ul>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const enabledModules = useEnabledModules();
  const filter = useNavFilter();
  const qc = useQueryClient();
  const { company } = useCompanyStore();

  const handlePrefetch = (href: string) => prefetchRoute(qc, href, company);

  // Stay expanded while a dropdown inside the sidebar is open, even if the
  // cursor leaves the aside to reach the popover content.
  const open = hovered || menuOpen;

  const main = filter(mainNav);
  const masterData = filter(masterDataNav);
  const transactions = filter(transactionNav);
  const stock = filter(stockNav);
  const accounting = filter(accountingNav);
  const warehouse = filter(warehouseNav);
  const factory = filter(factoryNav);
  const oee = filter(oeeNav);
  const manufacturing = filter(manufacturingNav);
  const assetMaintenance = filter(assetMaintenanceNav);
  const reports = filter(reportNav);
  const admin = filter(adminNav);

  return (
    <motion.aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(false);
      }}
      animate={{ width: open ? EXPANDED_W : COLLAPSED_W }}
      transition={SPRING}
      initial={false}
      className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden"
      aria-label="Sidebar navigation"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-2 py-3">
        <Link
          href="/dashboard"
          className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-label="Stable ERP home"
        >
          <Scale className="size-4" />
        </Link>
        <motion.div
          animate={{ opacity: open ? 1 : 0 }}
          transition={SPRING}
          className="flex flex-1 flex-col gap-0.5 leading-none overflow-hidden whitespace-nowrap"
        >
          <span className="text-sm font-semibold">Stable ERP</span>
          <span className="text-[10px] text-sidebar-foreground/60">Finance</span>
        </motion.div>
      </div>

      <motion.div
        animate={{ opacity: open ? 1 : 0, height: open ? "auto" : 0 }}
        transition={SPRING}
        className="border-b border-sidebar-border px-2 py-2 overflow-hidden"
      >
        <CompanySwitcher onOpenChange={setMenuOpen} />
      </motion.div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        <NavGroup
          labelKey="main"
          items={main}
          open={open}
          pathname={pathname}
          onPrefetch={handlePrefetch}
        />
        {isSidebarGroupEnabled("masterData", enabledModules) && (
          <NavGroup
            labelKey="masterData"
            items={masterData}
            open={open}
            pathname={pathname}
            onPrefetch={handlePrefetch}
          />
        )}
        {isSidebarGroupEnabled("transactions", enabledModules) && (
          <NavGroup
            labelKey="transactions"
            items={transactions}
            open={open}
            pathname={pathname}
            onPrefetch={handlePrefetch}
          />
        )}
        {isSidebarGroupEnabled("stock", enabledModules) && (
          <NavGroup
            labelKey="stock"
            items={stock}
            open={open}
            pathname={pathname}
            onPrefetch={handlePrefetch}
          />
        )}
        {isSidebarGroupEnabled("accounting", enabledModules) && (
          <NavGroup
            labelKey="accounting"
            items={accounting}
            open={open}
            pathname={pathname}
            onPrefetch={handlePrefetch}
          />
        )}
        {isSidebarGroupEnabled("warehouse", enabledModules) && (
          <NavGroup
            labelKey="warehouse"
            items={warehouse}
            open={open}
            pathname={pathname}
            onPrefetch={handlePrefetch}
          />
        )}
        {isSidebarGroupEnabled("factory", enabledModules) && (
          <NavGroup
            labelKey="factory"
            items={factory}
            open={open}
            pathname={pathname}
            onPrefetch={handlePrefetch}
          />
        )}
        {isSidebarGroupEnabled("manufacturing", enabledModules) && (
          <>
            <NavGroup
              labelKey="oee"
              items={oee}
              open={open}
              pathname={pathname}
              onPrefetch={handlePrefetch}
            />
            <NavGroup
              labelKey="manufacturing"
              items={manufacturing}
              open={open}
              pathname={pathname}
              onPrefetch={handlePrefetch}
            />
          </>
        )}
        {isSidebarGroupEnabled("assetMaintenance", enabledModules) && (
          <NavGroup
            labelKey="assetMaintenance"
            items={assetMaintenance}
            open={open}
            pathname={pathname}
            onPrefetch={handlePrefetch}
          />
        )}
        {isSidebarGroupEnabled("reports", enabledModules) && (
          <NavGroup
            labelKey="reports"
            items={reports}
            open={open}
            pathname={pathname}
            onPrefetch={handlePrefetch}
          />
        )}
        <NavGroup
          labelKey="admin"
          items={admin}
          open={open}
          pathname={pathname}
          onPrefetch={handlePrefetch}
        />
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2">
        <UserMenu open={open} onOpenChange={setMenuOpen} />
      </div>
    </motion.aside>
  );
}
