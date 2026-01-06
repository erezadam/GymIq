import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Debug: Log config status (not values for security)
console.log('🔧 Firebase Config Status:', {
  apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
  authDomain: firebaseConfig.authDomain ? `✓ ${firebaseConfig.authDomain}` : '✗ Missing',
  projectId: firebaseConfig.projectId ? `✓ ${firebaseConfig.projectId}` : '✗ Missing',
  storageBucket: firebaseConfig.storageBucket ? '✓ Set' : '✗ Missing',
  appId: firebaseConfig.appId ? '✓ Set' : '✗ Missing',
})

// Validate that all required config values are present
const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId'] as const
const missingKeys = requiredConfigKeys.filter(
  (key) => !firebaseConfig[key] || firebaseConfig[key] === `your_${key}`
)

if (missingKeys.length > 0) {
  console.error(`❌ Missing Firebase config: ${missingKeys.join(', ')}`)
  console.error('Please check your .env file has the correct VITE_FIREBASE_* variables')
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Set Hebrew as default language for auth
auth.languageCode = 'he'
