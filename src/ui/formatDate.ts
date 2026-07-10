// ABOUTME: Timezone-safe formatter for date-only ISO strings (YYYY-MM-DD).
// ABOUTME: Builds the Date from parts so it never shifts a day in US timezones.
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
