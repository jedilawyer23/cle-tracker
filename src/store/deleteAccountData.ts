// ABOUTME: Deletes every credit doc in a user's Firestore subcollection, then the users/{uid}
// ABOUTME: profile doc — used by account deletion, which must clear data before deleteUser().
import { collection, doc, getDocs, deleteDoc, type Firestore } from 'firebase/firestore'

export async function deleteAccountData(db: Firestore, uid: string): Promise<void> {
  const creditsSnap = await getDocs(collection(db, 'users', uid, 'credits'))
  await Promise.all(creditsSnap.docs.map(d => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'users', uid))
}
