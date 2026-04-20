"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { cn } from "@/lib/utils";
import { useLinkOptions } from "@/hooks/use-link-options";

interface LinkFieldProps {
  doctype: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filters?: unknown[];
  /** Fetch this field alongside `name` and display it as a secondary label. */
  descriptionField?: string;
  /** Fallback display text when the value isn't found in the options list. */
  displayValue?: string;
  /** Show "value — description" instead of just description when both exist. */
  showValueWithDescription?: boolean;
}

export function LinkField({
  doctype,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
  filters,
  descriptionField,
  displayValue,
  showValueWithDescription = false,
}: LinkFieldProps) {
  const [open, setOpen] = useState(false);
  // When popover closes, reset search immediately via lazy initializer gating
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  // Cache the selected option's description so it persists after popover closes
  const [cachedLabel, setCachedLabel] = useState<string | undefined>(displayValue);

  // Debounce search input — 300ms delay for server-side search
  // (setDebounced runs inside a setTimeout callback — not a synchronous setState in the effect body)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync cachedLabel: prefer displayValue when it's available (derived, no effect needed)
  const effectiveCachedLabel = displayValue || cachedLabel;

  // When effectiveSearch differs from debounced (e.g. popover just closed), use "" for query
  const searchQuery = open ? debounced : "";

  const { data: options = [], isLoading } = useLinkOptions(
    doctype,
    filters,
    descriptionField,
    searchQuery,
  );

  const selected = value ? options.find((o) => o.value === value) : undefined;

  function formatLabel(opt: { value: string; description?: string }): string {
    if (showValueWithDescription && opt.description) {
      return `${opt.value} — ${opt.description}`;
    }
    return opt.description || opt.value;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected ? formatLabel(selected) : effectiveCachedLabel || value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${doctype.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading..." : "No results found."}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => {
                    const newVal = opt.value === value ? "" : opt.value;
                    onChange(newVal);
                    setCachedLabel(newVal ? formatLabel(opt) : undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span>{formatLabel(opt)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
