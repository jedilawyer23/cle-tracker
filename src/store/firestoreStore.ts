// ABOUTME: Firestore-backed Store: users/{uid} profile + users/{uid}/credits subcollection.
// ABOUTME: Same Store interface M2 fulfilled with localStorage; only the backend changed.
import {
  doc, collection, onSnapshot, setDoc, deleteDoc, type Firestore, type Unsubscribe,
} from 'firebase/firestore'
import type { Store, UserProfile } from './types'
import type { Credit } from '../domain/types'
import {
  profileToDoc, docToProfile, creditToDoc, docToCredit,
} from '../firebase/mappers'

export class FirestoreStore implements Store {
  private db: Firestore
  private uid: string
  private profile: UserProfile | null = null
  private credits: Credit[] = []
  private listeners = new Set<() => void>()
  private unsubs: Unsubscribe[] = []
  private readyPromise: Promise<void>

  constructor(db: Firestore, uid: string) {
    this.db = db
    this.uid = uid
    let markReady!: () => void
    let profileLoaded = false
    let creditsLoaded = false
    this.readyPromise = new Promise((resolve) => { markReady = resolve })
    const settle = () => { if (profileLoaded && creditsLoaded) markReady() }

    this.unsubs.push(
      onSnapshot(doc(db, 'users', uid), (snap) => {
        this.profile = snap.exists() ? docToProfile(snap.data()) : null
        profileLoaded = true
        this.emit(); settle()
      }),
      onSnapshot(collection(db, 'users', uid, 'credits'), (snap) => {
        this.credits = snap.docs.map((d) => docToCredit(d.id, d.data()))
        creditsLoaded = true
        this.emit(); settle()
      }),
    )
  }

  ready() { return this.readyPromise }
  getProfile() { return this.profile }
  getCredits() { return this.credits }

  async saveProfile(profile: UserProfile) {
    await setDoc(doc(this.db, 'users', this.uid), profileToDoc(profile), { merge: true })
  }
  async addCredit(credit: Credit) {
    await setDoc(doc(this.db, 'users', this.uid, 'credits', credit.id), creditToDoc(credit))
  }
  async updateCredit(credit: Credit) {
    await setDoc(doc(this.db, 'users', this.uid, 'credits', credit.id), creditToDoc(credit), { merge: true })
  }
  async removeCredit(creditId: string) {
    await deleteDoc(doc(this.db, 'users', this.uid, 'credits', creditId))
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  dispose() { this.unsubs.forEach((u) => u()); this.listeners.clear() }
  private emit() { this.listeners.forEach((l) => l()) }
}
