"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown, Check, X } from "lucide-react";
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

interface MultiLinkFieldProps {
  doctype: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filters?: unknown[];
  descriptionField?: string;
  showValueWithDescription?: boolean;
}

export function MultiLinkField({
  doctype,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
  filters,
  descriptionField,
  showValueWithDescription = false,
}: MultiLinkFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  // Cache labels for selected values so the trigger label survives popover close
  // and re-renders when the search-filtered options list no longer includes them.
  const [labelCache, setLabelCache] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const searchQuery = open ? debounced : "";

  const { data: options = [], isLoading } = useLinkOptions(
    doctype,
    filters,
    descriptionField,
    searchQuery,
  );

  const selectedSet = useMemo(() => new Set(value), [value]);

  const formatLabel = (opt: { value: string; description?: string }): string => {
    if (showValueWithDescription && opt.description) {
      return `${opt.value} — ${opt.description}`;
    }
    return opt.description || opt.value;
  };

  // Refresh cache for currently-visible selected options.
  useEffect(() => {
    if (value.length === 0) return;
    let next: Record<string, string> | null = null;
    for (const opt of options) {
      if (selectedSet.has(opt.value) && labelCache[opt.value] !== formatLabel(opt)) {
        if (!next) next = { ...labelCache };
        next[opt.value] = formatLabel(opt);
      }
    }
    if (next) setLabelCache(next);
    // Only depend on options/value identity; formatLabel/labelCache are derived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, value]);

  const triggerLabel = (() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const v = value[0];
      const fromOptions = options.find((o) => o.value === v);
      return fromOptions ? formatLabel(fromOptions) : (labelCache[v] ?? v);
    }
    return `${value.length} selected`;
  })();

  const toggle = (optValue: string, label: string) => {
    if (selectedSet.has(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
      setLabelCache((c) => ({ ...c, [optValue]: label }));
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

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
            value.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {value.length > 0 && !disabled ? (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                className="hover:bg-accent rounded p-0.5"
                onClick={clearAll}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange([]);
                  }
                }}
              >
                <X className="h-3 w-3 opacity-60" />
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
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
              {options.map((opt) => {
                const checked = selectedSet.has(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => toggle(opt.value, formatLabel(opt))}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        checked ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span>{formatLabel(opt)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
