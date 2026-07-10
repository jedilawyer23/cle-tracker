// ABOUTME: A single row inside an inset-grouped List — title, optional meta line, optional trailing content.
// ABOUTME: Presentational and prop-driven; ports the `.row` markup/classes from mockups.html.
import type { ReactNode } from 'react'

export interface RowProps {
  label: string
  meta?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
}

export function Row({ label, meta, trailing, onClick }: RowProps) {
  return (
    <div className={onClick ? 'row tap' : 'row'} onClick={onClick}>
      <div className="t">
        <div className="n">{label}</div>
        {meta ? <div className="m q">{meta}</div> : null}
      </div>
      {trailing}
    </div>
  )
}
