/** Estimate reading time in minutes (200 wpm, minimum 1). */
export function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}
