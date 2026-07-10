// ABOUTME: Pulls the last whitespace-separated token out of a full name.
// ABOUTME: Shared by FirstRun (to derive the group) and App (to derive UserProfile.lastName).
export function lastToken(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean)
  return tokens[tokens.length - 1] ?? ''
}
