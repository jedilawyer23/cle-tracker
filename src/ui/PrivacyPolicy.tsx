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
      'When you upload a certificate photo or PDF, we send it to our AI parsing provider (Anthropic) to read the credit details, then discard it. The file itself is never stored. Only the credit details you review and save are kept.',
    ],
  },
  {
    heading: 'Where your data is stored',
    paragraphs: [
      'Your account and CLE records are stored in Google Firebase (Firestore), which provides our database, sign-in, and hosting. Firebase stores this data on our behalf as our service provider.',
    ],
  },
  {
    heading: 'Selling, sharing, and service providers',
    paragraphs: [
      'We do not sell your data, use it for advertising, or give it to anyone for their own purposes. To run clekeeper we rely on two service providers that process your data only on our behalf: Google Firebase (stores your records, handles Google Sign-In, and hosts the app) and Anthropic (reads the certificates you upload, as described above). Using them to operate the app is not the same as selling or sharing your information.',
    ],
  },
  {
    heading: 'Analytics and cookies',
    paragraphs: [
      'clekeeper runs no analytics, tracking, or advertising, and uses no tracking cookies. Your browser stores a small amount of data locally only to keep you signed in.',
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      "Your data is protected by Google Firebase's security infrastructure and access rules that limit each account to its own data. No online service can be perfectly secure, but we reduce risk by collecting only what the app needs and never storing your certificate files.",
    ],
  },
  {
    heading: 'Your choices and rights',
    paragraphs: [
      'You can edit or delete any CLE record, and delete your entire account and all associated data at any time from the Settings screen. If you are a California resident, you have rights under the CCPA/CPRA, including the right to know what we hold about you, to correct it, and to delete it. Deletion is available directly in the app, and you can also email us. We will not treat you differently for exercising these rights.',
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
