export function formatPracticeScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "N/A";
  return `${score.toFixed(1)}/10`;
}

export function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatSessionDuration(
  durationSeconds: number,
  plannedMinutes: number | null,
): string {
  if (durationSeconds > 0) {
    const mins = Math.max(1, Math.round(durationSeconds / 60));
    return `${mins} min`;
  }
  if (plannedMinutes != null && plannedMinutes > 0) {
    return `${plannedMinutes} min`;
  }
  return "—";
}

export function formatTotalPracticeTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
