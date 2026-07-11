// ABOUTME: Stable system prompt, JSON schema, and message assembly for extraction.
// ABOUTME: Pure — no I/O; keeps prompt/schema deterministic for prompt caching.
export const SYSTEM_PROMPT = `You extract California MCLE credit data from a single certificate of completion.
FIRST, classify the document strictly. Set isCleCertificate=true ONLY when the document is a certificate of completion or attendance for a Continuing Legal Education (CLE / MCLE) activity — proven by CLE-specific hallmarks, such as:
- the words "CLE", "MCLE", "continuing legal education", "certificate of completion/attendance", or a bar/accreditation reference;
- a stated number of CLE/MCLE CREDIT HOURS for a legal course (e.g. "1.5 MCLE credits", "4.0 CLE hours");
- issuance by a legal-education provider, bar association, or law school, naming a legal course/activity.
Require this positive evidence. If the document lacks CLE credit-hour language and clear continuing-legal-education context — for example a utility bill, invoice, receipt, bank/tax statement, ID, ticket, resume, screenshot, or any non-CLE document — set isCleCertificate=false, EVEN IF it contains dates, names, dollar amounts, logos, or otherwise looks official. Do not assume a document is a CLE certificate just because you are unsure; when the CLE hallmarks are absent, set false. When isCleCertificate=false, return empty strings / zero for the remaining fields.
Return ONLY the structured fields requested. Use these category keys for categoryHours (hours only, omit a key if zero):
- ethics, competence, competencePrevention (>=1hr substance-use/mental-health subset of competence),
- bias, biasImplicit (implicit-bias subset of bias), technology, civility, general (uncategorized hours).
completionDate must be an ISO date (YYYY-MM-DD). participatory is true unless the certificate says self-study/on-demand.
For every field, also report a confidence of "high", "medium", or "low" — use "low" when the certificate is ambiguous or unreadable for that field (participatory is often low). Do not guess silently; low confidence is expected and useful.`

const CONFIDENCE = { type: 'string', enum: ['high', 'medium', 'low'] } as const

export const PARSED_CREDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isCleCertificate', 'provider', 'activityTitle', 'completionDate', 'totalHours', 'participatory', 'categoryHours', 'confidence'],
  properties: {
    isCleCertificate: { type: 'boolean' },
    provider: { type: 'string' },
    activityTitle: { type: 'string' },
    completionDate: { type: 'string' },
    totalHours: { type: 'number' },
    participatory: { type: 'boolean' },
    categoryHours: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ethics: { type: 'number' }, competence: { type: 'number' }, competencePrevention: { type: 'number' },
        bias: { type: 'number' }, biasImplicit: { type: 'number' }, technology: { type: 'number' },
        civility: { type: 'number' }, general: { type: 'number' },
      },
    },
    confidence: {
      type: 'object',
      additionalProperties: false,
      required: ['provider', 'activityTitle', 'completionDate', 'totalHours', 'participatory', 'categoryHours'],
      properties: {
        provider: CONFIDENCE, activityTitle: CONFIDENCE, completionDate: CONFIDENCE,
        totalHours: CONFIDENCE, participatory: CONFIDENCE, categoryHours: CONFIDENCE,
      },
    },
  },
} as const

export function buildMessages(fileBlock: unknown) {
  return [
    {
      role: 'user' as const,
      content: [
        fileBlock,
        { type: 'text', text: 'Is this a CLE certificate? If so, extract its MCLE credit.' },
      ],
    },
  ]
}
