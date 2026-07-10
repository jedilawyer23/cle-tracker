// ABOUTME: Inset-grouped list card — white card, rounded corners, hairline separators inset to text.
// ABOUTME: Presentational wrapper for Row children; ports the `.list` markup/classes from mockups.html.
import type { ReactNode } from 'react'

export interface ListProps {
  children: ReactNode
}

export function List({ children }: ListProps) {
  return <div className="list">{children}</div>
}
