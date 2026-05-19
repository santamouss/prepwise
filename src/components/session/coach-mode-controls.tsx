"use client";

import type { CoachUiPhase } from "@/lib/practice/coach-mode-ui";
import {
  COACH_UI_COACHING_STATUS,
  COACH_UI_DONE_ANSWERING,
  COACH_UI_NEXT_QUESTION,
  COACH_UI_SUBTITLE,
  COACH_UI_TITLE,
  COACH_UI_TRY_AGAIN,
} from "@/lib/practice/coach-mode-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CoachModeControlsProps {
  phase: CoachUiPhase;
  attempt: number;
  errorMessage?: string;
  isConnected: boolean;
  isTransitioning: boolean;
  canGoNext: boolean;
  doneAnsweringDisabled?: boolean;
  onDoneAnswering: () => void;
  onTryAgain: () => void;
  onNextQuestion: () => void;
}

export function CoachModeControls({
  phase,
  attempt,
  errorMessage,
  isConnected,
  isTransitioning,
  canGoNext,
  doneAnsweringDisabled = false,
  onDoneAnswering,
  onTryAgain,
  onNextQuestion,
}: CoachModeControlsProps) {
  const disabled = !isConnected || isTransitioning;
  const doneDisabled = disabled || doneAnsweringDisabled;

  return (
    <div className="ph-coach-panel">
      <div>
        <p className="text-sm font-semibold text-foreground">{COACH_UI_TITLE}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{COACH_UI_SUBTITLE}</p>
        {attempt > 1 && (
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">Attempt {attempt}</p>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs font-medium text-destructive">{errorMessage}</p>
      )}

      {phase === "answering" && (
        <Button
          type="button"
          className="ph-primary-cta h-11"
          disabled={doneDisabled}
          onClick={onDoneAnswering}
        >
          {COACH_UI_DONE_ANSWERING}
        </Button>
      )}

      {phase === "coaching" && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/60 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {COACH_UI_COACHING_STATUS}
        </div>
      )}

      {phase === "waiting_for_choice" && (
        <div className="space-y-2.5">
          <p className="text-center text-xs text-muted-foreground">Choose your next step</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className={cn("flex-1 border-border/80 bg-background/80")}
              disabled={disabled}
              onClick={onTryAgain}
            >
              {COACH_UI_TRY_AGAIN}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={disabled || !canGoNext}
              onClick={onNextQuestion}
            >
              {COACH_UI_NEXT_QUESTION}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
