/** Word overlap between suffix of `a` and prefix of `b` (for stitching ASR fragments). */
export function findWordOverlapSuffixPrefix(a: string, b: string): number {
  const aWords = a.toLowerCase().split(/\s+/).filter(Boolean);
  const bWords = b.toLowerCase().split(/\s+/).filter(Boolean);
  const max = Math.min(aWords.length, bWords.length, 16);
  for (let len = max; len > 0; len--) {
    const suffix = aWords.slice(-len).join(" ");
    const prefix = bWords.slice(0, len).join(" ");
    if (suffix === prefix) return len;
  }
  return 0;
}

/**
 * Merge ASR fragments without dropping continuations.
 * Superset when one string contains the other; otherwise append with overlap stitch.
 */
export function mergeAsrText(previous: string, incoming: string): string {
  const prev = previous.trim();
  const next = incoming.trim();
  if (!next) return prev;
  if (!prev) return next;

  const prevLower = prev.toLowerCase();
  const nextLower = next.toLowerCase();

  if (nextLower.includes(prevLower)) return next;
  if (prevLower.includes(nextLower)) return prev;

  const overlapWords = findWordOverlapSuffixPrefix(prev, next);
  const looksLikeContinuation =
    overlapWords > 0 ||
    /^(and|but|so|also|then|because|or|plus)\b/i.test(next);

  if (next.length + 8 < prev.length && !looksLikeContinuation) {
    return prev;
  }

  if (overlapWords > 0) {
    const nextWords = next.split(/\s+/).filter(Boolean);
    const remainder = nextWords.slice(overlapWords).join(" ");
    return remainder ? `${prev} ${remainder}` : prev;
  }

  return `${prev} ${next}`;
}
