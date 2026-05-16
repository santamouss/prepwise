"use client";

import { useAuth } from "@/components/auth-provider";
import { ParkerLogo } from "@/components/ui/parker-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProfileUserType } from "@/lib/profile-user-type";
import { trpc } from "@/lib/trpc/client";
import { Briefcase, Loader2, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OnboardingChoice = ProfileUserType;

const OPTIONS: Array<{
  value: OnboardingChoice;
  title: string;
  subtitle: string;
  icon: typeof Target;
}> = [
  {
    value: "candidate",
    title: "I'm practicing for interviews",
    subtitle: "Get AI-powered mock interviews and feedback",
    icon: Target,
  },
  {
    value: "recruiter",
    title: "I'm hiring candidates",
    subtitle: "Create interviews and evaluate candidates",
    icon: Briefcase,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [selected, setSelected] = useState<OnboardingChoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setUserType = trpc.user.setUserType.useMutation({
    onSuccess: async () => {
      await refreshProfile();
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleContinue = () => {
    if (!selected) return;
    setError(null);
    setUserType.mutate({ userType: selected });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        <div className="flex flex-col items-center text-center">
          <ParkerLogo height={56} className="mb-6" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            How will you use Parker?
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            We&apos;ll customize your experience based on your answer.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                className={cn(
                  "flex flex-col items-start gap-3 rounded-xl border-2 p-6 text-left transition-colors",
                  isSelected
                    ? "border-[#3B6FF0] bg-[#EEF2FF]"
                    : "border-border bg-card hover:border-[#3B6FF0]/40 hover:bg-muted/30",
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-lg",
                    isSelected ? "bg-[#3B6FF0]/10 text-[#3B6FF0]" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{option.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {option.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : null}

        <div className="flex justify-center">
          <Button
            size="lg"
            className="min-w-[200px] bg-[#3B6FF0] hover:bg-[#3B6FF0]/90"
            disabled={!selected || setUserType.isPending}
            onClick={handleContinue}
          >
            {setUserType.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
