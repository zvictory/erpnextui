"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface QualityCheckProps {
  onResult: (passed: boolean, notes?: string) => void;
}

export function QualityCheck({ onResult }: QualityCheckProps) {
  const t = useTranslations("mfg.jobCards");
  const [result, setResult] = useState<"passed" | "failed" | null>(null);
  const [notes, setNotes] = useState("");

  function handlePassed() {
    setResult("passed");
    onResult(true);
  }

  function handleFailed() {
    setResult("failed");
  }

  function submitFailed() {
    onResult(false, notes);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("qualityCheck")}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {result === null && (
          <div className="flex gap-3">
            <Button
              className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePassed}
            >
              <CheckCircle2 className="mr-2 h-6 w-6" />
              {t("passed")}
            </Button>
            <Button
              className="flex-1 h-14 text-lg bg-red-600 hover:bg-red-700 text-white"
              onClick={handleFailed}
            >
              <XCircle className="mr-2 h-6 w-6" />
              {t("failed")}
            </Button>
          </div>
        )}

        {result === "passed" && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{t("passed")}</span>
          </div>
        )}

        {result === "failed" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{t("failed")}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-notes" className="text-sm">
                Notes
              </Label>
              <textarea
                id="qc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none min-h-[80px]"
              />
              <Button variant="destructive" className="w-full h-12" onClick={submitFailed}>
                Submit Report
              </Button>
            </div>
          </div>
        )}

        {/* Reset button */}
        {result !== null && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              setResult(null);
              setNotes("");
            }}
          >
            Reset
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
