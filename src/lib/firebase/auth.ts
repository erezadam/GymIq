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
  // Trainer-specific (when role === 'trainer')
  trainerProfile?: {
    specializations?: string[]
    bio?: string
    maxTrainees?: number // default 50
  }
  // Trainee-specific (when linked to trainer)
  trainerId?: string
  trainingGoals?: string[]
  injuriesOrLimitations?: string
  // Body metrics
  age?: number
  height?: number // cm
  weight?: number // kg
  bodyFatPercentage?: number
}

// Convert Firebase user to App user
// allowCreate: only set to true when called from registerUser with proper data
const createAppUser = async (
  firebaseUser: FirebaseUser,
  additionalData?: Partial<AppUser>,
  allowCreate: boolean = false
): Promise<AppUser | null> => {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    const data = userSnap.data()
    // Convert Firestore Timestamps to Dates if needed
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    } as AppUser
  }

  // Only create document if explicitly allowed (during registration)
  // This prevents race condition where onAuthChange creates doc before registerUser
  if (!allowCreate) {
    console.log('User document not found and creation not allowed - waiting for registration to complete')
    return null
  }

  // Create new user document - exclude undefined values for Firestore
  const newUser: AppUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: additionalData?.displayName || firebaseUser.displayName || '',
    firstName: additionalData?.firstName || '',
    lastName: additionalData?.lastName || '',
    role: additionalData?.role || 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Only add phoneNumber if it's defined (Firestore doesn't accept undefined)
  if (additionalData?.phoneNumber) {
    newUser.phoneNumber = additionalData.phoneNumber
  }

  // Prepare Firestore document (remove any remaining undefined values)
  const firestoreData = Object.fromEntries(
    Object.entries({
      ...newUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).filter(([_, value]) => value !== undefined)
  )

  await setDoc(userRef, firestoreData)

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
  console.log('=== Starting registration for:', email)

  // Step 1: Create Firebase Auth user first
  console.log('Step 1: Creating Firebase Auth user...')
  console.log('Auth instance:', auth ? '✓ Initialized' : '✗ Not initialized')
  console.log('Auth currentUser before:', auth.currentUser?.uid || 'None')

  let userCredential: UserCredential
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password)
    console.log('✓ Firebase Auth user created:', userCredential.user.uid)
    console.log('✓ User email:', userCredential.user.email)
  } catch (error: any) {
    console.error('✗ Failed to create Firebase Auth user')
    console.error('Error code:', error?.code)
    console.error('Error message:', error?.message)
    console.error('Full error:', JSON.stringify(error, null, 2))
    throw error // Re-throw to be handled by caller
  }

  // Step 2: Update display name
  console.log('Step 2: Updating display name...')
  try {
    await updateProfile(userCredential.user, {
      displayName: `${firstName} ${lastName}`,
    })
    console.log('✓ Display name updated')
  } catch (error: any) {
    console.error('✗ Failed to update display name:', error)
    // Non-critical, continue
  }

  // Step 3: Check if first user (now that we're authenticated)
  let firstUser = false
  try {
    firstUser = await isFirstUser()
    console.log('✓ First user check:', firstUser ? 'YES - will be admin' : 'NO - regular user')
  } catch (error) {
    console.error('⚠ isFirstUser check failed (will default to regular user):', error)
  }

  // Step 4: Create user document in Firestore
  const role = firstUser ? 'admin' : 'user'
  console.log('Step 4: Creating Firestore user document with role:', role)

  try {
    const appUser = await createAppUser(userCredential.user, {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      phoneNumber,
      role,
    }, true) // allowCreate = true for registration
    if (!appUser) {
      throw new Error('Failed to create user document')
    }
    console.log('✓ User document created in Firestore!')
    return appUser
  } catch (error: any) {
    console.error('✗ Failed to create Firestore user document:', error)
    // Auth user was created but Firestore failed - this is problematic
    // The user exists in Auth but not in Firestore
    throw new Error(`הרישום נכשל חלקית. אנא נסה להתחבר או פנה לתמיכה. (${error.code || error.message})`)
  }
}

// Login with email/password
export const loginUser = async (
  email: string,
  password: string
): Promise<AppUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  const appUser = await createAppUser(userCredential.user)

  // If user doc doesn't exist (edge case), create a basic one
  if (!appUser) {
    const firebaseUser = userCredential.user
    // Create a basic user doc for existing Auth users without Firestore doc
    const basicUser: AppUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      firstName: firebaseUser.displayName?.split(' ')[0] || '',
      lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    // Create the missing doc with allowCreate=true
    return await createAppUser(firebaseUser, basicUser, true) as AppUser
  }

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
        // Try to get user doc - may not exist yet during registration
        let appUser = await createAppUser(firebaseUser)

        // If doc doesn't exist, retry a few times (registration might be in progress)
        if (!appUser) {
          console.log('User doc not found, retrying...')
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 500))
            appUser = await createAppUser(firebaseUser)
            if (appUser) {
              console.log('User doc found on retry', i + 1)
              break
            }
          }
        }

        if (appUser) {
          callback(appUser)
        } else {
          // Still no doc after retries - use basic info from Firebase Auth
          console.log('User doc not found after retries, using Firebase Auth data')
          callback({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            firstName: firebaseUser.displayName?.split(' ')[0] || '',
            lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      } catch (error) {
        console.error('Error getting app user:', error)
        // Still call callback with basic user info so app doesn't hang
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
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
