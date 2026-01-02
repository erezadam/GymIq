# 🔐 GymIQ Authentication Module - הנחיות טכניות מפורטות

## 🎯 סקירה כללית

מודול ההזדהות של GymIQ עובד בפשטות מקסימלית:
- **רישום ראשון**: מספר טלפון + שם פרטי + שם משפחה
- **כניסות הבאות**: רק מספר טלפון

המערכת תשמור את המשתמשים במסד הנתונים ותזהה אותם לפי מספר הטלפון.

---

## 🏗️ ארכיטקטורת Authentication

### Firebase Configuration (רק לאחסון נתונים)
```typescript
// src/core/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Development emulator
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

### Environment Variables
```bash
# .env.local
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=gymiq-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gymiq-dev
VITE_FIREBASE_STORAGE_BUCKET=gymiq-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## 💾 Data Models

### User Types
```typescript
// src/domains/authentication/types/auth.types.ts
export interface UserProfile {
  // Basic info (חובה)
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  displayName: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  
  // App preferences
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark' | 'auto';
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Flow state
  currentStep: 'phone' | 'registration' | 'complete';
  isNewUser: boolean;
}
```

### Authentication DTOs
```typescript
// src/domains/authentication/types/dto.types.ts
export interface RegistrationDto {
  phoneNumber: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  phoneNumber: string;
}
```

---

## 🔧 Services & Business Logic

### Authentication Service
```typescript
// src/domains/authentication/services/AuthService.ts
import { doc, setDoc, getDoc, updateDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { UserProfile, RegistrationDto, LoginDto } from '../types/auth.types';

export class AuthService {
  
  // Check if user exists by phone number
  async checkUserExists(phoneNumber: string): Promise<UserProfile | null> {
    try {
      const formattedPhone = this.formatIsraeliPhoneNumber(phoneNumber);
      
      const q = query(
        collection(db, 'users'), 
        where('phoneNumber', '==', formattedPhone)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as UserProfile;
    } catch (error) {
      console.error('Error checking user existence:', error);
      throw new Error('שגיאה בבדיקת משתמש');
    }
  }

  // Register new user
  async registerUser(registrationData: RegistrationDto): Promise<UserProfile> {
    try {
      const formattedPhone = this.formatIsraeliPhoneNumber(registrationData.phoneNumber);
      
      // Check if user already exists
      const existingUser = await this.checkUserExists(formattedPhone);
      if (existingUser) {
        throw new Error('משתמש עם מספר טלפון זה כבר קיים');
      }

      // Create new user profile
      const userId = this.generateUserId();
      const userProfile: UserProfile = {
        id: userId,
        phoneNumber: formattedPhone,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        displayName: `${registrationData.firstName} ${registrationData.lastName}`,
        
        // Defaults
        language: 'he',
        theme: 'dark',
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', userId), userProfile);
      
      return userProfile;
    } catch (error) {
      console.error('Error registering user:', error);
      if (error.message) {
        throw error;
      }
      throw new Error('שגיאה ברישום המשתמש');
    }
  }

  // Login existing user
  async loginUser(loginData: LoginDto): Promise<UserProfile> {
    try {
      const formattedPhone = this.formatIsraeliPhoneNumber(loginData.phoneNumber);
      
      // Check if user exists
      const user = await this.checkUserExists(formattedPhone);
      if (!user) {
        throw new Error('משתמש לא נמצא במערכת');
      }
      
      // Update last login time
      await updateDoc(doc(db, 'users', user.id), {
        lastLoginAt: new Date(),
        updatedAt: new Date()
      });
      
      const updatedUser = { ...user, lastLoginAt: new Date() };
      return updatedUser;
    } catch (error) {
      console.error('Error logging in user:', error);
      if (error.message) {
        throw error;
      }
      throw new Error('שגיאה בהתחברות');
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('שגיאה בעדכון פרופיל');
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;
      
      return { id: userDoc.id, ...userDoc.data() } as UserProfile;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Format Israeli phone number
  private formatIsraeliPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different Israeli phone number formats
    if (cleaned.startsWith('972')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+972${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      return `+972${cleaned}`;
    }
    
    return `+972${cleaned}`;
  }

  // Generate unique user ID
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Israeli phone numbers: 05X-XXXXXXX (9 digits without 0, 10 with 0)
    if (cleaned.startsWith('0')) {
      return cleaned.length === 10 && cleaned.startsWith('05');
    }
    
    return cleaned.length === 9 && cleaned.startsWith('5');
  }

  // Validate name
  validateName(name: string): boolean {
    return name.trim().length >= 2 && name.trim().length <= 50;
  }
}

export const authService = new AuthService();
```

---

## 🎣 Custom Hooks

### Authentication Hook
```typescript
// src/domains/authentication/hooks/useAuth.ts
import { useState, useCallback } from 'react';
import { authService } from '../services/AuthService';
import { UserProfile, AuthState, RegistrationDto, LoginDto } from '../types/auth.types';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    currentStep: 'phone',
    isNewUser: false
  });

  // Check if phone number exists and determine if registration or login
  const checkPhoneNumber = useCallback(async (phoneNumber: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const existingUser = await authService.checkUserExists(phoneNumber);
      
      if (existingUser) {
        // User exists - proceed with login
        setAuthState(prev => ({
          ...prev,
          user: existingUser,
          isAuthenticated: true,
          currentStep: 'complete',
          isNewUser: false,
          isLoading: false
        }));
      } else {
        // New user - proceed with registration
        setAuthState(prev => ({
          ...prev,
          currentStep: 'registration',
          isNewUser: true,
          isLoading: false
        }));
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, []);

  // Register new user
  const register = useCallback(async (registrationData: RegistrationDto) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const userProfile = await authService.registerUser(registrationData);
      
      setAuthState(prev => ({
        ...prev,
        user: userProfile,
        isAuthenticated: true,
        currentStep: 'complete',
        isNewUser: false,
        isLoading: false
      }));
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, []);

  // Login existing user
  const login = useCallback(async (loginData: LoginDto) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const userProfile = await authService.loginUser(loginData);
      
      setAuthState(prev => ({
        ...prev,
        user: userProfile,
        isAuthenticated: true,
        currentStep: 'complete',
        isLoading: false
      }));
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, []);

  // Sign out (clear local state)
  const signOut = useCallback(() => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      currentStep: 'phone',
      isNewUser: false
    });
  }, []);

  // Reset to initial state
  const resetAuth = useCallback(() => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      currentStep: 'phone',
      isNewUser: false
    });
  }, []);

  return {
    ...authState,
    checkPhoneNumber,
    register,
    login,
    signOut,
    resetAuth
  };
};
```

---

## 🧪 Component Structure

### Component Organization
```typescript
// src/domains/authentication/components/
// ├── AuthContainer/
// │   ├── AuthContainer.tsx
// │   ├── AuthContainer.styles.ts
// │   └── index.ts
// ├── PhoneRegistration/
// │   ├── PhoneRegistration.tsx
// │   ├── PhoneRegistration.styles.ts
// │   └── index.ts
// ├── PhoneLogin/
// │   ├── PhoneLogin.tsx
// │   ├── PhoneLogin.styles.ts
// │   └── index.ts
// ├── VerificationCode/
// │   ├── VerificationCode.tsx
// │   ├── VerificationCode.styles.ts
// │   └── index.ts
// └── ProfileSetup/
//     ├── ProfileSetup.tsx
//     ├── ProfileSetup.styles.ts
//     └── index.ts

// Example component structure
// src/domains/authentication/components/PhoneRegistration/PhoneRegistration.tsx
import React, { useState } from 'react';
import { PhoneInput } from '@/design-system/components/molecules/PhoneInput';
import { Button } from '@/design-system/components/atoms/Button';
import { Card } from '@/design-system/components/atoms/Card';
import { Text } from '@/design-system/components/atoms/Text';
import { useAuth } from '../../hooks/useAuth';
import { validatePhoneNumber, validateName } from '../../utils/validation';

export const PhoneRegistration: React.FC = () => {
  const { register, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    firstName: '',
    lastName: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors: Record<string, string> = {};
    
    if (!validatePhoneNumber(formData.phoneNumber)) {
      errors.phoneNumber = 'מספר טלפון לא תקין';
    }
    
    if (!validateName(formData.firstName)) {
      errors.firstName = 'שם פרטי נדרש';
    }
    
    if (!validateName(formData.lastName)) {
      errors.lastName = 'שם משפחה נדרש';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});
    await register(formData.phoneNumber, formData.firstName, formData.lastName);
  };

  return (
    <Card className="neon-card w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="logo-glow mb-4">
          {/* Logo component */}
        </div>
        <Text variant="display" size="large" className="text-text-primary mb-2">
          ברוכים הבאים ל-GymIQ
        </Text>
        <Text variant="body" className="text-text-secondary">
          בואו נתחיל את המסע שלכם לכושר חכם
        </Text>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PhoneInput
          value={formData.phoneNumber}
          onChange={(value) => setFormData(prev => ({ ...prev, phoneNumber: value }))}
          error={formErrors.phoneNumber}
          placeholder="0547895818"
        />

        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">
            שם פרטי
          </label>
          <input
            type="text"
            className={`neon-input w-full ${formErrors.firstName ? 'border-red-500' : ''}`}
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            placeholder="הזינו את השם הפרטי"
          />
          {formErrors.firstName && (
            <p className="text-red-400 text-sm mt-1">{formErrors.firstName}</p>
          )}
        </div>

        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">
            שם משפחה
          </label>
          <input
            type="text"
            className={`neon-input w-full ${formErrors.lastName ? 'border-red-500' : ''}`}
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            placeholder="הזינו את שם המשפחה"
          />
          {formErrors.lastName && (
            <p className="text-red-400 text-sm mt-1">{formErrors.lastName}</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <Text className="text-red-400 text-sm">{error}</Text>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="large"
          className="w-full neon-button"
          disabled={isLoading}
          loading={isLoading}
        >
          שליחת קוד אימות
        </Button>

        <Text variant="caption" className="text-text-muted text-center">
          נשלח לכם קוד אימות ב-SMS
        </Text>
      </form>

      <div id="recaptcha-container"></div>
    </Card>
  );
};
```

---

## ⚡ Performance Optimizations

### Code Splitting
```typescript
// Lazy load auth components
const PhoneRegistration = React.lazy(() => 
  import('./components/PhoneRegistration').then(module => ({
    default: module.PhoneRegistration
  }))
);

const VerificationCode = React.lazy(() => 
  import('./components/VerificationCode').then(module => ({
    default: module.VerificationCode
  }))
);

// Router setup with lazy loading
const AuthRoutes = () => (
  <Suspense fallback={<AuthLoadingSpinner />}>
    <Routes>
      <Route path="/register" element={<PhoneRegistration />} />
      <Route path="/verify" element={<VerificationCode />} />
      <Route path="/login" element={<PhoneLogin />} />
    </Routes>
  </Suspense>
);
```

### Error Boundaries
```typescript
// src/domains/authentication/components/AuthErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Auth error:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-dark-bg">
          <Card className="neon-card max-w-md">
            <div className="text-center">
              <Text variant="display" className="text-text-primary mb-4">
                שגיאה במערכת ההזדהות
              </Text>
              <Text className="text-text-secondary mb-6">
                אנא רענן את הדף ונסה שנית
              </Text>
              <Button onClick={() => window.location.reload()}>
                רענן דף
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

*המודול הזה יספק חוויית הזדהות מושלמת עם העיצוב המיוחד שלך וביצועים מעולים!* 🔐✨