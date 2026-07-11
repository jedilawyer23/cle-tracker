// ABOUTME: Copies given source credits into a target uid's credits, skipping duplicates (by
// ABOUTME: creditSignature). Caller reads the source BEFORE any auth switch so rules permit it.
import { addDoc, collection, getDocs, type Firestore } from 'firebase/firestore'
import { creditToDoc } from '../firebase/mappers'
import { creditSignature } from '../domain/creditSignature'
import type { Credit } from '../domain/types'

// `sourceCredits` must be read by the caller while still authenticated as the source uid —
// after signInWithCredential switches auth to `toUid`, security rules deny reading the source.
export async function mergeCreditsIntoAccount(
  db: Firestore,
  toUid: string,
  sourceCredits: Credit[],
): Promise<number> {
  const toSnap = await getDocs(collection(db, 'users', toUid, 'credits'))
  const existingSignatures = new Set(
    toSnap.docs.map((d) => creditSignature(d.data() as Omit<Credit, 'id'>)),
  )

  let copied = 0
  for (const credit of sourceCredits) {
    const signature = creditSignature(credit)
    if (existingSignatures.has(signature)) continue
    await addDoc(collection(db, 'users', toUid, 'credits'), creditToDoc(credit))
    existingSignatures.add(signature)
    copied++
  }
  return copied
}
