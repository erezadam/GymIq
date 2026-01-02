import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, limit, query } from 'firebase/firestore'
import { auth, db } from './config'

// User type for our app
export interface AppUser {
  uid: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  phoneNumber?: string
  role: 'user' | 'trainer' | 'admin'
  createdAt: Date
  updatedAt: Date
}

// Convert Firebase user to App user
const createAppUser = async (
  firebaseUser: FirebaseUser,
  additionalData?: Partial<AppUser>
): Promise<AppUser> => {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    return userSnap.data() as AppUser
  }

  // Create new user document
  const newUser: AppUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: additionalData?.displayName || firebaseUser.displayName || '',
    firstName: additionalData?.firstName || '',
    lastName: additionalData?.lastName || '',
    phoneNumber: additionalData?.phoneNumber,
    role: additionalData?.role || 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await setDoc(userRef, {
    ...newUser,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return newUser
}

// Check if this is the first user (make them admin)
const isFirstUser = async (): Promise<boolean> => {
  try {
    const usersQuery = query(collection(db, 'users'), limit(1))
    const snapshot = await getDocs(usersQuery)
    console.log('Users collection check:', snapshot.empty ? 'empty (first user!)' : 'has users')
    return snapshot.empty
  } catch (error) {
    console.error('Error checking first user:', error)
    return false // Default to regular user if check fails
  }
}

// Register new user
export const registerUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phoneNumber?: string
): Promise<AppUser> => {
  console.log('Starting registration for:', email)

  // Check if this will be the first user (make them admin)
  let firstUser = false
  try {
    firstUser = await isFirstUser()
  } catch (error) {
    console.error('isFirstUser check failed:', error)
  }

  console.log('Creating Firebase Auth user...')
  const userCredential: UserCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  )
  console.log('Firebase Auth user created:', userCredential.user.uid)

  // Update display name
  await updateProfile(userCredential.user, {
    displayName: `${firstName} ${lastName}`,
  })
  console.log('Display name updated')

  // Create user in Firestore (first user becomes admin)
  const role = firstUser ? 'admin' : 'user'
  console.log('Creating Firestore user document with role:', role)

  const appUser = await createAppUser(userCredential.user, {
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    phoneNumber,
    role,
  })
  console.log('User document created in Firestore!')

  return appUser
}

// Login with email/password
export const loginUser = async (
  email: string,
  password: string
): Promise<AppUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  const appUser = await createAppUser(userCredential.user)
  return appUser
}

// Logout
export const logoutUser = async (): Promise<void> => {
  await signOut(auth)
}

// Get current user from Firestore
export const getCurrentUser = async (): Promise<AppUser | null> => {
  const firebaseUser = auth.currentUser
  if (!firebaseUser) return null

  const userRef = doc(db, 'users', firebaseUser.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) return null

  return userSnap.data() as AppUser
}

// Listen to auth state changes
export const onAuthChange = (callback: (user: AppUser | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const appUser = await createAppUser(firebaseUser)
        callback(appUser)
      } catch (error) {
        console.error('Error creating app user:', error)
        // Still call callback with basic user info so app doesn't hang
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          firstName: '',
          lastName: '',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    } else {
      callback(null)
    }
  })
}

// Password reset
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email)
}

// Update user profile in Firestore
export const updateUserProfile = async (
  uid: string,
  data: Partial<AppUser>
): Promise<void> => {
  const userRef = doc(db, 'users', uid)
  await setDoc(
    userRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}
