/**
 * PKCE OAuth redirect URL for signInWithOAuth.
 * Prefer NEXT_PUBLIC_APP_URL so redirects match deployed origin; fallback to browser origin locally.
 */
export function getOAuthCallbackUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin =
    typeof window !== "undefined"
      ? (configured ?? window.location.origin)
      : (configured ?? "");
  return `${origin}/auth/callback`;
}
