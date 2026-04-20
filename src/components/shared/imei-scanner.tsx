"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Scan, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ImeiScannerProps {
  onScan: (imei: string) => void;
  scannedItems?: string[];
  expectedCount?: number;
  disabled?: boolean;
  className?: string;
}

/** Validate IMEI format: 15 digits */
function isValidImei(value: string): boolean {
  return /^\d{15}$/.test(value.trim());
}

export function ImeiScanner({
  onScan,
  scannedItems = [],
  expectedCount,
  disabled,
  className,
}: ImeiScannerProps) {
  const t = useTranslations("workflow");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (!isValidImei(trimmed)) {
      setError("IMEI must be 15 digits");
      return;
    }

    if (scannedItems.includes(trimmed)) {
      setError("Already scanned");
      return;
    }

    setError("");
    onScan(trimmed);
    setValue("");
    inputRef.current?.focus();
  }, [value, scannedItems, onScan]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("scanImei")}
            className="pl-9 font-mono"
            disabled={disabled}
            autoFocus
          />
        </div>
        {expectedCount && (
          <Badge variant={scannedItems.length >= expectedCount ? "default" : "secondary"}>
            {scannedItems.length}/{expectedCount}
          </Badge>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {scannedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scannedItems.map((imei) => (
            <Badge key={imei} variant="outline" className="font-mono text-xs gap-1">
              <Check className="h-3 w-3 text-green-500" />
              {imei.slice(-6)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
