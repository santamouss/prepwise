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
    <div className="mx-4 mt-3 space-y-3 rounded-lg border border-[#3B6FF0]/25 bg-[#EEF2FF] px-4 py-3 text-[#1e3a8a]">
      <div>
        <p className="text-sm font-semibold">{COACH_UI_TITLE}</p>
        <p className="mt-0.5 text-xs text-[#1e3a8a]/80">{COACH_UI_SUBTITLE}</p>
        {attempt > 1 && (
          <p className="mt-1 text-xs font-medium">Attempt {attempt}</p>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs font-medium text-destructive">{errorMessage}</p>
      )}

      {phase === "answering" && (
        <Button
          type="button"
          className="w-full bg-[#3B6FF0] hover:bg-[#3B6FF0]/90"
          disabled={doneDisabled}
          onClick={onDoneAnswering}
        >
          {COACH_UI_DONE_ANSWERING}
        </Button>
      )}

      {phase === "coaching" && (
        <div className="flex items-center justify-center gap-2 text-sm text-[#1e3a8a]/90">
          <Loader2 className="h-4 w-4 animate-spin" />
          {COACH_UI_COACHING_STATUS}
        </div>
      )}

      {phase === "waiting_for_choice" && (
        <div className="space-y-2">
          <p className="text-center text-xs text-[#1e3a8a]/85">
            Choose your next step:
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className={cn("flex-1 border-[#3B6FF0]/40 bg-white/70")}
              disabled={disabled}
              onClick={onTryAgain}
            >
              {COACH_UI_TRY_AGAIN}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#3B6FF0] hover:bg-[#3B6FF0]/90"
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
