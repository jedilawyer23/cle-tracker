// ABOUTME: Small muted legal footer shown on the dashboard and setup screen — copyright plus
// ABOUTME: Privacy and Terms links (open content screens) and a mailto Contact link.
interface LegalFooterProps {
  onOpenPrivacy: () => void
  onOpenTerms: () => void
}

export function LegalFooter({ onOpenPrivacy, onOpenTerms }: LegalFooterProps) {
  return (
    <div className="legalfoot">
      <div className="copy">© 2026 clekeeper</div>
      <div className="links">
        <button className="navlink" onClick={onOpenPrivacy}>Privacy</button>
        <span className="sep">·</span>
        <button className="navlink" onClick={onOpenTerms}>Terms</button>
        <span className="sep">·</span>
        <a className="navlink" href="mailto:support@turbosloth.org">Contact</a>
      </div>
    </div>
  )
}
