// ABOUTME: Copies a source uid's credits into a target uid's collection, skipping anything the
// ABOUTME: target already has (by creditSignature). Pure Firestore I/O — no Google auth needed.
import { addDoc, collection, getDocs, type Firestore } from 'firebase/firestore'
import { creditToDoc } from '../firebase/mappers'
import { creditSignature } from '../domain/creditSignature'
import type { Credit } from '../domain/types'

export async function mergeCreditsIntoAccount(
  db: Firestore,
  fromUid: string,
  toUid: string,
): Promise<number> {
  const [fromSnap, toSnap] = await Promise.all([
    getDocs(collection(db, 'users', fromUid, 'credits')),
    getDocs(collection(db, 'users', toUid, 'credits')),
  ])

  const existingSignatures = new Set(
    toSnap.docs.map((d) => creditSignature(d.data() as Omit<Credit, 'id'>)),
  )

  let copied = 0
  for (const sourceDoc of fromSnap.docs) {
    const data = sourceDoc.data() as Omit<Credit, 'id'>
    const signature = creditSignature(data)
    if (existingSignatures.has(signature)) continue
    await addDoc(collection(db, 'users', toUid, 'credits'), creditToDoc({ id: sourceDoc.id, ...data }))
    existingSignatures.add(signature)
    copied++
  }
  return copied
}
