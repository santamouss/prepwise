/** Safe in-app path for post-auth navigation (blocks open redirects). */
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (path?.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return null;
}

/** Where to send the user after email/password login or register. */
export function getPostLoginPath(
  redirect: string | null | undefined,
  autoStart: string | null | undefined,
): string {
  const safe = safeRedirectPath(redirect);
  if (safe === "/practice" && autoStart === "true") {
    return "/practice?autoStart=true";
  }
  if (safe) return safe;
  return "/dashboard";
}

export function getRegisterHref(
  redirect: string | null | undefined,
  autoStart: string | null | undefined,
): string {
  const params = new URLSearchParams();
  const safe = safeRedirectPath(redirect);
  if (safe) params.set("redirect", safe);
  if (autoStart === "true") params.set("autoStart", "true");
  const query = params.toString();
  return query ? `/register?${query}` : "/register";
}

/** OAuth callback `next` query value (path + optional search). */
export function getOAuthNextParam(
  redirect: string | null | undefined,
  autoStart: string | null | undefined,
): string {
  return getPostLoginPath(redirect, autoStart);
}
