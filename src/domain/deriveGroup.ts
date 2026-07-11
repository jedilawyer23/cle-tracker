// ABOUTME: Derives the permanent MCLE compliance group from an attorney's last name.
// ABOUTME: Group is set by the first letter: A–G=1, H–M=2, N–Z=3.
import type { Group } from './types'

export function deriveGroup(lastName: string): Group {
  // Strip accents to their base Latin letter first — otherwise the A-Z filter below drops the
  // accented letter entirely and picks up the wrong one (e.g. "Álvarez" falling to "Lvarez").
  const unaccented = lastName.normalize('NFD').replace(/[̀-ͯ]/g, '')
  const letter = unaccented.toUpperCase().replace(/[^A-Z]/g, '')[0]
  if (!letter) throw new Error(`Cannot derive group: no letters in "${lastName}"`)
  if (letter <= 'G') return 1
  if (letter <= 'M') return 2
  return 3
}
