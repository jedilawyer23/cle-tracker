// ABOUTME: Terms of Use content screen — draft copy for the owner's legal review, rendered
// ABOUTME: through the shared LegalPage layout.
import { LegalPage, type LegalSection } from './LegalPage'

const SECTIONS: LegalSection[] = [
  {
    heading: 'What clekeeper is',
    paragraphs: [
      'clekeeper is a tool to help California attorneys track their Minimum Continuing Legal Education (MCLE) compliance. It is provided as a convenience.',
    ],
  },
  {
    heading: 'Not legal advice; not the State Bar',
    paragraphs: [
      "clekeeper is not legal advice and is not affiliated with, endorsed by, or connected to the State Bar of California. The requirements, categories, and deadlines shown are our interpretation of the State Bar's published rules and may not be current or complete.",
    ],
  },
  {
    heading: 'You are responsible for your own compliance',
    paragraphs: [
      'You are solely responsible for meeting your MCLE obligations. Always confirm your requirements, credits, and deadlines directly with the State Bar of California. Do not rely on clekeeper as your system of record. Automated reading of uploaded certificates can be wrong — review every detail before you rely on it.',
    ],
  },
  {
    heading: 'No warranty',
    paragraphs: [
      'clekeeper is provided "as is," without warranties of any kind, express or implied, including accuracy, fitness for a particular purpose, or availability.',
    ],
  },
  {
    heading: 'Limitation of liability',
    paragraphs: [
      'To the fullest extent permitted by law, we are not liable for any damages arising from your use of, or inability to use, clekeeper — including any missed deadline, non-compliance, penalty, or loss resulting from reliance on information the app displays.',
    ],
  },
  {
    heading: 'Acceptable use',
    paragraphs: [
      'Use clekeeper only for its intended purpose. Do not attempt to disrupt, overload, or misuse the service.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      'We may update these terms; the "last updated" date reflects the latest version.',
    ],
  },
  {
    heading: 'Governing law',
    paragraphs: [
      'These terms are governed by the laws of the State of California.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'support@turbosloth.org.',
    ],
  },
]

export function Terms({ onBack }: { onBack: () => void }) {
  return <LegalPage title="Terms of Use" lastUpdated="July 13, 2026" sections={SECTIONS} onBack={onBack} />
}
