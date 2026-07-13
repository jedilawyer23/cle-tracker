// ABOUTME: Privacy Policy content screen — draft copy for the owner's legal review, rendered
// ABOUTME: through the shared LegalPage layout.
import { LegalPage, type LegalSection } from './LegalPage'

const SECTIONS: LegalSection[] = [
  {
    paragraphs: [
      'clekeeper ("we") helps California attorneys track their MCLE compliance. This policy explains what we collect and how we handle it.',
    ],
  },
  {
    heading: 'What we collect',
    paragraphs: [
      'Your name: you enter it so we can determine your MCLE compliance group, which is based on your last name.',
      'Your CLE records: the credit details you add or upload — provider, course, date, hours, and category.',
      "Account information: when you use clekeeper as a guest we create an anonymous account identifier; if you sign in with Google we receive your Google account's email address and basic profile (name and photo) so we can save your records and sync them across devices.",
    ],
  },
  {
    heading: 'Certificate files',
    paragraphs: [
      'When you upload a certificate photo or PDF, we send it to our AI parsing provider (Anthropic) to read the credit details. The file itself is not stored: it is processed and discarded. Only the credit details you review and save are kept.',
    ],
  },
  {
    heading: 'Where your data is stored',
    paragraphs: [
      'Your records are stored in Google Firebase (Firestore), associated with your account. We use Google Firebase for authentication, database, and hosting.',
    ],
  },
  {
    heading: 'Who we share it with',
    paragraphs: [
      'We do not sell your personal information, and we do not use it for advertising. We share data only with the providers that make clekeeper work: Google (Firebase — authentication, database, hosting, and Google Sign-In) and Anthropic (to parse the certificates you upload, as described above).',
    ],
  },
  {
    heading: 'Your choices and rights',
    paragraphs: [
      'You can edit or delete any individual CLE record, and delete your entire account and all associated data at any time from the Settings screen. As California residents, you have rights under the CCPA/CPRA, including the right to know what we hold and the right to delete it; deletion is available directly in the app, and you can also contact us.',
    ],
  },
  {
    heading: 'Data retention',
    paragraphs: [
      'We keep your records until you delete them or delete your account.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'clekeeper is intended for licensed attorneys and is not directed to anyone under 18.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      'We may update this policy; the "last updated" date above reflects the latest version.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'Questions? Email support@turbosloth.org.',
    ],
  },
]

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return <LegalPage title="Privacy Policy" lastUpdated="July 13, 2026" sections={SECTIONS} onBack={onBack} />
}
