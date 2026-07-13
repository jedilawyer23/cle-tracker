// ABOUTME: Full-screen scrollable legal content page — a Back control, a title, a "Last updated"
// ABOUTME: line, and prose sections (optional heading + one or more paragraphs). Presentational.
export interface LegalSection {
  heading?: string
  paragraphs: string[]
}

interface LegalPageProps {
  title: string
  lastUpdated: string
  sections: LegalSection[]
  onBack: () => void
}

export function LegalPage({ title, lastUpdated, sections, onBack }: LegalPageProps) {
  return (
    <div className="wrap">
      <div className="topline"><button className="back" onClick={onBack}>‹ Back</button><div className="sp" /></div>
      <h1 className="h1" tabIndex={-1}>{title}</h1>
      <div className="sub">Last updated: {lastUpdated}</div>

      <div className="legal">
        {sections.map((section, i) => (
          <div key={section.heading ?? i}>
            {section.heading && <h2>{section.heading}</h2>}
            {section.paragraphs.map((paragraph, j) => (
              <p key={j}>{paragraph}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
