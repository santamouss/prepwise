import { Loader2 } from "lucide-react";
import { ParkerLogo } from "@/components/ui/parker-logo";

export function PreparingScreen({
  title = "Preparing your interview...",
  subtitle = "This will only take a moment.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-card px-6">
        <div className="flex items-center gap-1">
          <ParkerLogo height={56} className="shrink-0" />
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
