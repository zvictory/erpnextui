"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Play, Pause, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useManufacturingStore } from "@/stores/manufacturing-store";
import { useStartJobCard, useCompleteJobCard } from "@/hooks/use-manufacturing";
import type { JobCard } from "@/types/manufacturing";

interface JobCardTimerProps {
  jobCard: JobCard;
}

function formatTimer(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function JobCardTimer({ jobCard }: JobCardTimerProps) {
  const t = useTranslations("mfg.jobCards");
  const { activeTimers, startTimer, pauseTimer, clearTimer, getElapsed } = useManufacturingStore();

  const timer = activeTimers[jobCard.name];
  const isRunning = !!timer && timer.startedAt > 0;
  const isPaused = !!timer && timer.startedAt === 0 && timer.elapsed > 0;
  const isCompleted = jobCard.status === "Completed";

  const [tickMs, setTickMs] = useState(() => getElapsed(jobCard.name));
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completedQty, setCompletedQty] = useState(String(jobCard.for_quantity));

  const startJobCard = useStartJobCard();
  const completeJobCard = useCompleteJobCard();

  // Tick effect: update display every second while running
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTickMs(getElapsed(jobCard.name));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, jobCard.name, getElapsed]);

  // Derive display ms: when not running, always show current elapsed from store
  const displayMs = isRunning ? tickMs : getElapsed(jobCard.name);

  // Compute final time for completed job cards from time logs
  const completedTime = isCompleted
    ? (jobCard.time_logs || []).reduce((sum, log) => sum + (log.time_in_mins || 0), 0) * 60_000
    : 0;

  const handleStart = useCallback(() => {
    startTimer(jobCard.name);
    startJobCard.mutate(jobCard.name, {
      onError: (err) => toast.error(err.message),
    });
  }, [jobCard.name, startTimer, startJobCard]);

  const handlePause = useCallback(() => {
    pauseTimer(jobCard.name);
  }, [jobCard.name, pauseTimer]);

  const handleResume = useCallback(() => {
    startTimer(jobCard.name);
  }, [jobCard.name, startTimer]);

  const handleComplete = useCallback(() => {
    const qty = parseFloat(completedQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    const elapsed = getElapsed(jobCard.name);
    const timeInMins = elapsed / 60_000;

    completeJobCard.mutate(
      { name: jobCard.name, completedQty: qty, timeInMins },
      {
        onSuccess: () => {
          clearTimer(jobCard.name);
          setShowCompleteForm(false);
          toast.success(t("complete"));
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [completedQty, jobCard.name, getElapsed, completeJobCard, clearTimer, t]);

  // Determine displayed time
  const displayTime = isCompleted ? completedTime : displayMs;

  // Background color based on state
  const bgClass = isRunning
    ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
    : isPaused
      ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
      : isCompleted
        ? "bg-muted border-border"
        : "bg-card border-border";

  return (
    <Card className={bgClass}>
      <CardContent className="p-6 space-y-6">
        {/* Timer label */}
        <p className="text-sm font-medium text-center text-muted-foreground uppercase tracking-wider">
          {t("timer")}
        </p>

        {/* Large timer display */}
        <p className="text-5xl font-mono font-bold text-center tabular-nums tracking-tight">
          {formatTimer(displayTime)}
        </p>

        {/* Status indicator */}
        {isRunning && (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              {t("workInProgress")}
            </span>
          </div>
        )}
        {isPaused && (
          <p className="text-sm text-center text-yellow-600 dark:text-yellow-400">{t("pause")}d</p>
        )}

        {/* Complete form (qty input) */}
        {showCompleteForm && (
          <div className="space-y-3 p-4 rounded-lg bg-background border">
            <Label htmlFor="completed-qty" className="text-sm font-medium">
              {t("completedQty")}
            </Label>
            <Input
              id="completed-qty"
              type="number"
              min="0"
              step="any"
              value={completedQty}
              onChange={(e) => setCompletedQty(e.target.value)}
              className="text-lg h-12 text-center font-mono"
            />
            <div className="flex gap-3">
              <Button
                className="flex-1 h-12"
                onClick={handleComplete}
                disabled={completeJobCard.isPending}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                {completeJobCard.isPending ? "..." : t("complete")}
              </Button>
              <Button variant="outline" className="h-12" onClick={() => setShowCompleteForm(false)}>
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isCompleted && !showCompleteForm && (
          <div className="flex gap-3">
            {!isRunning && !isPaused && (
              <Button
                className="flex-1 h-14 text-lg"
                onClick={handleStart}
                disabled={startJobCard.isPending}
              >
                <Play className="mr-2 h-6 w-6" />
                {startJobCard.isPending ? "..." : t("start")}
              </Button>
            )}

            {isRunning && (
              <>
                <Button variant="outline" className="flex-1 h-14 text-lg" onClick={handlePause}>
                  <Pause className="mr-2 h-6 w-6" />
                  {t("pause")}
                </Button>
                <Button className="flex-1 h-14 text-lg" onClick={() => setShowCompleteForm(true)}>
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                  {t("complete")}
                </Button>
              </>
            )}

            {isPaused && (
              <>
                <Button className="flex-1 h-14 text-lg" onClick={handleResume}>
                  <Play className="mr-2 h-6 w-6" />
                  {t("resume")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-14 text-lg"
                  onClick={() => setShowCompleteForm(true)}
                >
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                  {t("complete")}
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
