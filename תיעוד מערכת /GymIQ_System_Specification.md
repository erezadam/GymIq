# 📋 איפיון מערכת GymIQ - מפרט טכני מלא

## 📊 סטטוס מימוש פיצ'רים (עדכון: ינואר 2026)

| פיצ'ר | סטטוס | הערות |
|-------|-------|-------|
| **Authentication** | ✅ מומש | Email/Password דרך Firebase Auth |
| **Exercise Library** | ✅ מומש | ספריית תרגילים עם סינון וחיפוש |
| **Workout Builder** | ✅ מומש | בניית אימון, הוספת סטים |
| **Workout Session** | ✅ מומש | ביצוע אימון בזמן אמת |
| **Workout History** | ✅ מומש | היסטוריית אימונים בסיסית |
| **Admin Panel** | ✅ מומש | ניהול תרגילים ומשתמשים |
| **Progress Analytics** | ⏳ בתכנון | גרפים ומעקב התקדמות |
| **Trainer Features** | ⏳ בתכנון | ניהול לקוחות למאמנים |
| **Social Features** | ❌ לא התחיל | אתגרים, שיתוף |
| **AI Features** | ❌ לא התחיל | המלצות חכמות |
| **Gym Management** | ❌ לא התחיל | ניהול מתקנים |

**מקרא:** ✅ מומש | ⏳ בתכנון/בפיתוח | ❌ לא התחיל

---

## 🎯 תיאור המוצר

**GymIQ** היא פלטפורמת כושר חכמה המיועדת למתאמנים פרטיים ומאמנים מקצועיים. המערכת מספקת כלים מתקדמים למעקב אימונים, תכנון תוכניות, ניתוח ביצועים וניהול לקוחות.

---

## 👥 קהל יעד

### 1. משתמשים פרטיים (End Users)
- **מתאמנים מתחילים** - זקוקים להדרכה ומעקב בסיסי
- **מתאמנים מתקדמים** - רוצים ניתוח מעמיק וגמישות
- **חובבי כושר** - מעוניינים במגוון תוכניות ואתגרים

### 2. מאמנים מקצועיים (Trainers)
- **מאמנים אישיים** - ניהול לקוחות ותכנון אישי
- **מאמנים בחדרי כושר** - כלי עבודה מתקדמים
- **מתמחים בתחומים** - כלים ייעודיים לתחום התמחותם

### 3. מנהלי מתקנים (Admins)
- **בעלי חדרי כושר** - ניהול מתקן ועובדים
- **רשתות כושר** - ניתוח נתונים רוחב ארגוני

---

## 🏗️ מבנה המערכת

### Core Modules (מודולים עיקריים)

#### 1. 🔐 Authentication & User Management
```typescript
interface UserProfile {
  id: string;
  email: string;
  phoneNumber: string;
  displayName: string;
  avatar?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  
  // Physical attributes
  height?: number; // cm
  weight?: number; // kg
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  
  // Preferences
  preferredUnits: 'metric' | 'imperial';
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark' | 'auto';
  
  // Subscription & roles
  subscriptionType: 'free' | 'premium' | 'trainer' | 'admin';
  roles: UserRole[];
  
  // Timestamps
  createdAt: Date;
  lastActiveAt: Date;
}

interface UserRole {
  type: 'user' | 'trainer' | 'admin';
  permissions: Permission[];
  assignedBy?: string;
  assignedAt: Date;
}
```

#### 2. 💪 Exercise Library
```typescript
interface Exercise {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  
  // Classification
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  
  // Media
  images: string[]; // GitHub URLs
  videos?: string[]; // YouTube/Vimeo URLs
  demonstrations?: string[];
  
  // Instructions
  instructions: string[];
  instructionsHe: string[];
  tips?: string[];
  commonMistakes?: string[];
  
  // Variations
  variations?: ExerciseVariation[];
  alternatives?: string[]; // Exercise IDs
  
  // Metrics
  trackingType: 'reps_weight' | 'time' | 'distance' | 'calories' | 'custom';
  defaultSets?: number;
  defaultReps?: number;
  restTime?: number; // seconds
  
  // Metadata
  createdBy: string;
  isVerified: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

enum ExerciseCategory {
  CHEST = 'chest',
  BACK = 'back',
  SHOULDERS = 'shoulders',
  ARMS = 'arms',
  LEGS = 'legs',
  CORE = 'core',
  CARDIO = 'cardio',
  FUNCTIONAL = 'functional',
  STRETCHING = 'stretching',
  REHABILITATION = 'rehabilitation'
}

enum MuscleGroup {
  // Upper body
  CHEST = 'chest',
  BACK = 'back',
  SHOULDERS = 'shoulders',
  BICEPS = 'biceps',
  TRICEPS = 'triceps',
  FOREARMS = 'forearms',
  
  // Core
  ABS = 'abs',
  OBLIQUES = 'obliques',
  LOWER_BACK = 'lower_back',
  
  // Lower body
  QUADRICEPS = 'quadriceps',
  HAMSTRINGS = 'hamstrings',
  GLUTES = 'glutes',
  CALVES = 'calves',
  HIP_FLEXORS = 'hip_flexors'
}
```

#### 3. 🏋️ Workout System
```typescript
interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  category: WorkoutCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedDuration: number; // minutes
  
  // Structure
  exercises: WorkoutExercise[];
  restPeriods: RestPeriod[];
  
  // Metadata
  createdBy: string;
  isPublic: boolean;
  tags: string[];
  rating?: number;
  usageCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface WorkoutExercise {
  exerciseId: string;
  order: number;
  sets: ExerciseSet[];
  restTime?: number; // seconds
  notes?: string;
  superset?: string; // grouping ID for supersets
}

interface ExerciseSet {
  id: string;
  type: 'warmup' | 'working' | 'dropset' | 'amrap' | 'time';
  targetReps?: number;
  targetWeight?: number;
  targetTime?: number; // seconds
  targetDistance?: number; // meters
  
  // Actual performance (filled during workout)
  actualReps?: number;
  actualWeight?: number;
  actualTime?: number;
  actualDistance?: number;
  rpe?: number; // Rate of Perceived Exertion 1-10
  completed: boolean;
}

interface WorkoutSession {
  id: string;
  templateId?: string; // null for freestyle workouts
  userId: string;
  
  // Session data
  startTime: Date;
  endTime?: Date;
  totalDuration?: number; // minutes
  status: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
  
  // Performance
  exercises: WorkoutExercise[];
  notes?: string;
  rating?: number; // 1-10 satisfaction
  
  // Metrics
  totalVolume?: number; // kg * reps
  averageHeartRate?: number;
  maxHeartRate?: number;
  caloriesBurned?: number;
  
  // Location & equipment
  gymId?: string;
  equipment?: Equipment[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. 📊 Progress Tracking & Analytics
```typescript
interface ProgressMetric {
  id: string;
  userId: string;
  type: MetricType;
  value: number;
  unit: string;
  recordedAt: Date;
  
  // Context
  workoutId?: string;
  exerciseId?: string;
  notes?: string;
  
  // Body measurements
  bodyPart?: BodyPart;
  
  // Performance metrics
  oneRepMax?: number;
  personalRecord?: boolean;
}

enum MetricType {
  // Body metrics
  WEIGHT = 'weight',
  BODY_FAT = 'body_fat',
  MUSCLE_MASS = 'muscle_mass',
  CIRCUMFERENCE = 'circumference',
  
  // Performance metrics
  MAX_WEIGHT = 'max_weight',
  MAX_REPS = 'max_reps',
  TOTAL_VOLUME = 'total_volume',
  ENDURANCE = 'endurance',
  
  // Health metrics
  RESTING_HEART_RATE = 'resting_heart_rate',
  BLOOD_PRESSURE = 'blood_pressure',
  SLEEP_HOURS = 'sleep_hours',
  STEPS = 'steps'
}

interface AnalyticsReport {
  id: string;
  userId: string;
  type: ReportType;
  period: DateRange;
  
  // Calculated metrics
  workoutsCompleted: number;
  totalVolume: number;
  averageWorkoutDuration: number;
  strengthGains: ProgressSummary[];
  
  // Advanced analytics
  muscleGroupBalance: MuscleGroupAnalysis[];
  weeklyTrends: TrendAnalysis[];
  achievements: Achievement[];
  recommendations: Recommendation[];
  
  generatedAt: Date;
}
```

#### 5. 👨‍🏫 Trainer Features
```typescript
interface TrainerProfile extends UserProfile {
  // Professional info
  certifications: Certification[];
  specializations: Specialization[];
  experience: number; // years
  hourlyRate?: number;
  
  // Business details
  bio: string;
  contactInfo: ContactInfo;
  availability: AvailabilitySlot[];
  maxClients?: number;
  
  // Platform metrics
  rating: number;
  reviewCount: number;
  clientCount: number;
  completedSessions: number;
}

interface ClientRelation {
  id: string;
  trainerId: string;
  clientId: string;
  status: 'active' | 'inactive' | 'pending' | 'terminated';
  
  // Program details
  programId?: string;
  startDate: Date;
  endDate?: Date;
  
  // Communication
  lastContact: Date;
  communicationPreference: 'in_app' | 'email' | 'sms' | 'whatsapp';
  
  // Progress tracking
  initialAssessment?: Assessment;
  currentGoals: Goal[];
  progressNotes: ProgressNote[];
  
  createdAt: Date;
  updatedAt: Date;
}

interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  trainerId: string;
  
  // Program structure
  duration: number; // weeks
  workoutsPerWeek: number;
  phases: ProgramPhase[];
  
  // Target audience
  targetLevel: FitnessLevel[];
  targetGoals: Goal[];
  requiredEquipment: Equipment[];
  
  // Content
  workouts: WorkoutTemplate[];
  nutritionPlan?: NutritionPlan;
  educationalContent?: EducationalContent[];
  
  // Business
  price?: number;
  isPublic: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### 6. 🏢 Gym Management (Admin)
```typescript
interface GymFacility {
  id: string;
  name: string;
  type: 'commercial' | 'private' | 'home' | 'outdoor';
  
  // Location
  address: Address;
  coordinates: GeoPoint;
  
  // Details
  description: string;
  amenities: Amenity[];
  equipment: GymEquipment[];
  
  // Hours & access
  operatingHours: OperatingHours[];
  accessType: 'public' | 'members_only' | 'private';
  
  // Management
  ownerId: string;
  staff: StaffMember[];
  
  // Features
  hasWiFi: boolean;
  hasParkingequipment: boolean;
  hasShowers: boolean;
  hasLockers: boolean;
  
  // Subscription
  membershipPlans: MembershipPlan[];
  
  createdAt: Date;
  updatedAt: Date;
}

interface GymEquipment {
  id: string;
  name: string;
  type: EquipmentType;
  brand?: string;
  model?: string;
  
  // Status
  status: 'available' | 'in_use' | 'maintenance' | 'broken';
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  
  // Usage tracking
  currentUserId?: string;
  usageHistory: EquipmentUsage[];
  
  // Specifications
  weightRange?: WeightRange;
  specifications: Record<string, any>;
}
```

---

## 🎯 פיצ'רים מתקדמים

### 1. 🤖 AI-Powered Features
```typescript
interface AIFeatures {
  // Workout generation
  smartWorkoutGenerator: {
    personalizedRecommendations: boolean;
    adaptiveProgression: boolean;
    injuryPreventionAlerts: boolean;
  };
  
  // Form analysis
  formAnalysis: {
    videoAnalysis: boolean;
    realTimeFeedback: boolean;
    techniqueScoring: boolean;
  };
  
  // Nutrition
  nutritionCoach: {
    mealPlanning: boolean;
    macroTracking: boolean;
    supplementRecommendations: boolean;
  };
  
  // Recovery
  recoveryOptimization: {
    sleepAnalysis: boolean;
    stressMonitoring: boolean;
    recoveryRecommendations: boolean;
  };
}
```

### 2. 🌐 Social Features
```typescript
interface SocialFeatures {
  // Community
  challenges: Challenge[];
  leaderboards: Leaderboard[];
  workoutBuddies: BuddySystem;
  
  // Content sharing
  workoutSharing: boolean;
  progressPhotos: boolean;
  achievements: Achievement[];
  
  // Communication
  messaging: MessagingSystem;
  forums: Forum[];
  liveClasses: LiveClass[];
}
```

### 3. 📱 Mobile-Specific Features
```typescript
interface MobileFeatures {
  // Offline support
  offlineWorkouts: boolean;
  dataSync: boolean;
  
  // Device integration
  wearableSync: WearableDevice[];
  cameraIntegration: boolean;
  voiceCommands: boolean;
  
  // Notifications
  workoutReminders: boolean;
  progressMilestones: boolean;
  motivationalMessages: boolean;
  
  // PWA features
  installPrompt: boolean;
  backgroundSync: boolean;
  pushNotifications: boolean;
}
```

---

## 🔧 טכניות מתקדמות

### 1. Performance Requirements
- **Page Load Time**: < 2 seconds on 3G
- **First Contentful Paint**: < 1.5 seconds
- **Time to Interactive**: < 3 seconds
- **Bundle Size**: < 150KB initial load
- **Memory Usage**: < 100MB on mobile

### 2. Scalability Goals
- **Concurrent Users**: 10,000+
- **Database Size**: 100GB+
- **API Response Time**: < 200ms average
- **Uptime**: 99.9%

### 3. Security Features
- **End-to-end encryption** for sensitive data
- **Multi-factor authentication** (SMS, email, app)
- **Role-based access control** (RBAC)
- **Data anonymization** for analytics
- **GDPR compliance** full support

---

## 📊 מחוונים ו-KPIs

### User Engagement
- Daily Active Users (DAU)
- Session duration
- Workout completion rate
- Feature adoption rate

### Business Metrics
- Monthly Recurring Revenue (MRR)
- Customer Lifetime Value (CLV)
- Churn rate
- Net Promoter Score (NPS)

### Technical Metrics
- API response time
- Error rate
- Crash rate
- Load time

---

## 🚀 Roadmap & Phases

### Phase 1: MVP (חודשים 1-2)
- [ ] User authentication
- [ ] Basic workout tracking
- [ ] Exercise library (50 exercises)
- [ ] Simple progress charts
- [ ] Mobile-responsive design

### Phase 2: Enhanced Features (חודשים 3-4)
- [ ] Workout templates
- [ ] Social features
- [ ] Trainer onboarding
- [ ] Advanced analytics
- [ ] Offline support

### Phase 3: Professional Tools (חודשים 5-6)
- [ ] Client management for trainers
- [ ] Custom program builder
- [ ] Payment integration
- [ ] Admin dashboard
- [ ] API for third-party integrations

### Phase 4: AI & Advanced (חודשים 7+)
- [ ] AI workout generation
- [ ] Form analysis
- [ ] Nutrition tracking
- [ ] Wearable integration
- [ ] Advanced analytics

---

*המפרט הזה מהווה את הבסיס לפיתוח המערכת המלא ומתעדכן לפי צרכים עסקיים וטכניים.*