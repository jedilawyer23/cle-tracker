// ABOUTME: Rounds an hours value for display only — never for storage or compliance math.
// ABOUTME: Keeps floating-point sums (e.g. 1.2 + 2.2) from rendering as 3.4000000000000004.
export function formatHours(hours: number): number {
  return Math.round(hours * 10) / 10
}
