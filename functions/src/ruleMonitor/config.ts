// ABOUTME: The calbar.ca.gov pages the MCLE rule-change detector watches. The State Bar publishes
// ABOUTME: no API, so we fingerprint the human-readable rule pages and alert a human on any change.
export interface MonitoredSource {
  key: string
  url: string
  label: string
}

export const MONITORED_SOURCES: MonitoredSource[] = [
  {
    key: 'mcle-requirements',
    url: 'https://www.calbar.ca.gov/legal-professionals/maintaining-compliance/mcle/mcle-requirements',
    label: 'MCLE Requirements (hours per category)',
  },
  {
    key: 'compliance-groups',
    url: 'https://www.calbar.ca.gov/legal-professionals/maintaining-compliance/mcle/compliance-groups',
    label: 'MCLE Compliance Groups & reporting deadlines',
  },
]
