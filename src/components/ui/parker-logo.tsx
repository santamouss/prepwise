import { cn } from "@/lib/utils";

const WORDMARK_SRC = "/images/marketing/parker-logo.png";
const ICON_SRC = "/images/marketing/parker-icon.png";

type ParkerLogoProps = {
  /** Pixel height; width follows aspect ratio for wordmark. */
  height?: number;
  /** Wordmark (default) or standalone icon. */
  variant?: "wordmark" | "icon";
  className?: string;
};

/**
 * Parker brand logo for auth, headers, and session UIs.
 */
export function ParkerLogo({
  height = 56,
  variant = "wordmark",
  className,
}: ParkerLogoProps) {
  const src = variant === "icon" ? ICON_SRC : WORDMARK_SRC;
  const isIcon = variant === "icon";
  return (
    <img
      src={src}
      alt="Parker"
      height={height}
      width={isIcon ? height : undefined}
      decoding="async"
      className={cn(
        "w-auto shrink-0 object-contain object-left",
        isIcon && "aspect-square",
        className,
      )}
      style={{ height }}
    />
  );
}
