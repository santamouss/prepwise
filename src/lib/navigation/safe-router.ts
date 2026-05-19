type AppRouterLike = {
  replace: (href: string) => void;
  push: (href: string) => void;
};

/** Pathname + search string for stable comparison (ignores hash). */
export function locationHref(
  pathname: string,
  search?: string | URLSearchParams | null,
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (search == null || search === "") return path;

  const qs =
    typeof search === "string"
      ? search.startsWith("?")
        ? search.slice(1)
        : search
      : search.toString();

  return qs ? `${path}?${qs}` : path;
}

/** Parse a same-origin relative target like `/dashboard` or `/practice?autoStart=true`. */
export function parseAppPath(target: string): { pathname: string; search: string } {
  const url = new URL(target, "http://local");
  return { pathname: url.pathname, search: url.search };
}

export function pathsEqual(
  currentPathname: string,
  currentSearch: string | URLSearchParams | null | undefined,
  target: string,
): boolean {
  const { pathname, search } = parseAppPath(target);
  return (
    locationHref(currentPathname, currentSearch ?? "") ===
    locationHref(pathname, search)
  );
}

/** No-op when `target` is already the current location (avoids Safari replaceState loops). */
export function safeReplace(
  router: Pick<AppRouterLike, "replace">,
  currentPathname: string,
  currentSearch: string | URLSearchParams | null | undefined,
  target: string,
): boolean {
  if (pathsEqual(currentPathname, currentSearch, target)) {
    return false;
  }
  router.replace(target);
  return true;
}

export function safePush(
  router: Pick<AppRouterLike, "push">,
  currentPathname: string,
  currentSearch: string | URLSearchParams | null | undefined,
  target: string,
): boolean {
  if (pathsEqual(currentPathname, currentSearch, target)) {
    return false;
  }
  router.push(target);
  return true;
}

export function stripSearchParams(
  pathname: string,
  search: string | URLSearchParams,
  keysToRemove: readonly string[],
): string {
  const params = new URLSearchParams(
    typeof search === "string" ? search.replace(/^\?/, "") : search.toString(),
  );
  for (const key of keysToRemove) {
    params.delete(key);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
