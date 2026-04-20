"use client";

import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Users,
  Truck,
  Package,
  FileOutput,
  FileInput,
  CreditCard,
  ShoppingCart,
  ClipboardList,
  UserCheck,
  Loader2,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { frappe } from "@/lib/frappe-client";

interface DoctypeConfig {
  doctype: string;
  field: string;
  nameField?: string;
  href: (name: string) => string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const DOCTYPE_CONFIGS: Omit<DoctypeConfig, "label">[] = [
  {
    doctype: "Customer",
    field: "customer_name",
    href: (n) => `/customers/${encodeURIComponent(n)}`,
    icon: Users,
  },
  {
    doctype: "Supplier",
    field: "supplier_name",
    href: (n) => `/vendors/${encodeURIComponent(n)}`,
    icon: Truck,
  },
  {
    doctype: "Item",
    field: "item_name",
    nameField: "item_code",
    href: (n) => `/products/${encodeURIComponent(n)}`,
    icon: Package,
  },
  {
    doctype: "Sales Invoice",
    field: "customer",
    href: (n) => `/sales-invoices/${encodeURIComponent(n)}`,
    icon: FileOutput,
  },
  {
    doctype: "Purchase Invoice",
    field: "supplier",
    href: (n) => `/purchase-invoices/${encodeURIComponent(n)}`,
    icon: FileInput,
  },
  { doctype: "Payment Entry", field: "party_name", href: (_n) => `/payments`, icon: CreditCard },
  {
    doctype: "Sales Order",
    field: "customer",
    href: (n) => `/sales-orders/${encodeURIComponent(n)}`,
    icon: ShoppingCart,
  },
  {
    doctype: "Purchase Order",
    field: "supplier",
    href: (n) => `/purchase-orders/${encodeURIComponent(n)}`,
    icon: ClipboardList,
  },
  {
    doctype: "Employee",
    field: "employee_name",
    href: (n) => `/employees/${encodeURIComponent(n)}`,
    icon: UserCheck,
  },
];

interface SearchResult {
  doctype: string;
  name: string;
  displayName: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  type SearchState = { query: string; results: SearchResult[]; isSearching: boolean };
  type SearchAction =
    | { type: "SET_QUERY"; query: string }
    | { type: "SET_SEARCHING"; isSearching: boolean }
    | { type: "SET_RESULTS"; results: SearchResult[] }
    | { type: "RESET" }
    | { type: "CLEAR_QUERY" };

  const [searchState, dispatchSearch] = useReducer(
    (state: SearchState, action: SearchAction): SearchState => {
      switch (action.type) {
        case "SET_QUERY":
          return { ...state, query: action.query };
        case "SET_SEARCHING":
          return { ...state, isSearching: action.isSearching };
        case "SET_RESULTS":
          return { ...state, results: action.results, isSearching: false };
        case "RESET":
          return { query: "", results: [], isSearching: false };
        case "CLEAR_QUERY":
          return { ...state, query: "", results: [], isSearching: false };
        default:
          return state;
      }
    },
    { query: "", results: [], isSearching: false },
  );

  const { query, results, isSearching } = searchState;
  const setQuery = (v: string) => dispatchSearch({ type: "SET_QUERY", query: v });
  const setResults = (v: SearchResult[]) => dispatchSearch({ type: "SET_RESULTS", results: v });
  const setIsSearching = (v: boolean) => dispatchSearch({ type: "SET_SEARCHING", isSearching: v });
  const router = useRouter();
  const t = useTranslations("common");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Cancel previous in-flight requests
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);

    try {
      const promises = DOCTYPE_CONFIGS.map(async (config) => {
        if (controller.signal.aborted) return [];
        try {
          const items = await frappe.getList<Record<string, string>>(config.doctype, {
            filters: [
              [
                "or",
                [
                  [config.field, "like", `%${term}%`],
                  ["name", "like", `%${term}%`],
                ],
              ],
            ],
            fields: ["name", config.field],
            limitPageLength: 5,
          });
          return items.map((item) => ({
            doctype: config.doctype,
            name: item.name,
            displayName: item[config.field] ? `${item.name} - ${item[config.field]}` : item.name,
            href: config.href(item.name),
            icon: config.icon,
          }));
        } catch {
          // If a single doctype fails (e.g. no permission), skip it
          return [];
        }
      });

      const allResults = await Promise.all(promises);
      if (!controller.signal.aborted) {
        setResults(allResults.flat());
        setIsSearching(false);
      }
    } catch {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  // Debounced search (single dispatch per branch — no cascading renders)
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) {
      dispatchSearch({ type: "CLEAR_QUERY" });
      return;
    }
    dispatchSearch({ type: "SET_SEARCHING", isSearching: true });
    timerRef.current = setTimeout(() => {
      search(query);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, search]);

  // Reset on close (single dispatch)
  useEffect(() => {
    if (!open) {
      dispatchSearch({ type: "RESET" });
    }
  }, [open]);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  // Group results by doctype
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.doctype]) acc[r.doctype] = [];
    acc[r.doctype].push(r);
    return acc;
  }, {});

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("globalSearch")}
      description={t("globalSearchPlaceholder")}
      showCloseButton={false}
    >
      <CommandInput
        placeholder={t("globalSearchPlaceholder")}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isSearching && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isSearching && query.trim() && results.length === 0 && (
          <CommandEmpty>{t("noSearchResults")}</CommandEmpty>
        )}
        {Object.entries(grouped).map(([doctype, items]) => (
          <CommandGroup key={doctype} heading={doctype}>
            {items.map((item) => (
              <CommandItem
                key={`${item.doctype}-${item.name}`}
                value={`${item.doctype}-${item.name}-${item.displayName}`}
                onSelect={() => handleSelect(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{item.displayName}</span>
                <span className="ml-2 text-xs text-muted-foreground">{item.doctype}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
