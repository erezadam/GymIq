import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore'
import { db } from './config'
import type { AppUser } from './auth'

// Get all users (admin only)
export const getAllUsers = async (): Promise<AppUser[]> => {
  const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(usersQuery)
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    uid: doc.id,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as AppUser[]
}

// Update user role
export const updateUserRole = async (
  userId: string,
  role: 'user' | 'trainer' | 'admin'
): Promise<void> => {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    role,
    updatedAt: serverTimestamp(),
  })
}

// Delete user (from Firestore only - Auth deletion requires Admin SDK)
export const deleteUserFromFirestore = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId)
  await deleteDoc(userRef)
}

// Get user stats
export const getUserStats = async (): Promise<{
  total: number
  admins: number
  trainers: number
  users: number
}> => {
  const usersRef = collection(db, 'users')

  const [totalSnap, adminsSnap, trainersSnap] = await Promise.all([
    getCountFromServer(usersRef),
    getCountFromServer(query(usersRef, where('role', '==', 'admin'))),
    getCountFromServer(query(usersRef, where('role', '==', 'trainer'))),
  ])

  const total = totalSnap.data().count
  const admins = adminsSnap.data().count
  const trainers = trainersSnap.data().count

  return {
    total,
    admins,
    trainers,
    users: total - admins - trainers,
  }
}
