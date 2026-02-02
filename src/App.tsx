import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { UpdateBanner } from '@/shared/components/UpdateBanner'
import { useVersionCheck } from '@/shared/hooks/useVersionCheck'
import { AuthGuard, GuestGuard } from '@/app/router/guards'

// Lazy load pages
// Auth
const LoginPage = lazy(() => import('@/domains/authentication/components/LoginPage'))

// Trainer
const TrainerLayout = lazy(() => import('@/domains/trainer/components/TrainerLayout'))
const TrainerDashboard = lazy(() => import('@/domains/trainer/components/TrainerDashboard'))
const ProgramBuilder = lazy(() => import('@/domains/trainer/components/ProgramBuilder/ProgramBuilder'))
const TraineeDetail = lazy(() => import('@/domains/trainer/components/TraineeDetail'))

// Admin
const AdminLayout = lazy(() => import('@/domains/admin/components/AdminLayout'))
const ExerciseList = lazy(() => import('@/domains/admin/components/ExerciseList'))
const ExerciseForm = lazy(() => import('@/domains/admin/components/ExerciseForm'))
const UsersList = lazy(() => import('@/domains/admin/components/UsersList'))
const MuscleManager = lazy(() => import('@/domains/admin/components/MuscleManager'))
const EquipmentManager = lazy(() => import('@/domains/admin/components/EquipmentManager'))
const BandTypeManager = lazy(() => import('@/domains/admin/components/BandTypeManager'))
const ReportTypeManager = lazy(() => import('@/domains/admin/components/ReportTypeManager'))
const ExerciseSetManager = lazy(() => import('@/domains/admin/components/ExerciseSetManager'))
const AdminSettings = lazy(() => import('@/domains/admin/components/AdminSettings'))

// User
const MainLayout = lazy(() => import('@/design-system/layouts/MainLayout'))
const UserDashboard = lazy(() => import('@/domains/dashboard/components/UserDashboard'))

// Workouts
const WorkoutBuilder = lazy(() => import('@/domains/workouts/components/WorkoutBuilder'))
const ActiveWorkoutScreen = lazy(() => import('@/domains/workouts/components/active-workout/ActiveWorkoutScreen'))
const WorkoutHistory = lazy(() => import('@/domains/workouts/components/WorkoutHistory'))
const PersonalRecords = lazy(() => import('@/domains/workouts/components/PersonalRecords'))

// Exercises
const ExerciseLibrary = lazy(() => import('@/domains/exercises/components/ExerciseLibrary'))

function App() {
  const { updateAvailable, newVersion, performUpdate, dismissUpdate } = useVersionCheck()

  return (
    <>
      {/* Update Banner */}
      {updateAvailable && (
        <UpdateBanner
          onUpdate={performUpdate}
          onDismiss={dismissUpdate}
          newVersion={newVersion}
        />
      )}

      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <GuestGuard>
              <LoginPage />
            </GuestGuard>
          }
        />

        {/* User Routes (Protected) */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <MainLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="exercises" element={<ExerciseLibrary />} />
          <Route path="workout/new" element={<ExerciseLibrary />} />
          <Route path="workout/builder" element={<WorkoutBuilder />} />
          <Route path="workout/session" element={<ActiveWorkoutScreen />} />
          <Route path="workout/history" element={<WorkoutHistory />} />
          <Route path="workout/history/:id" element={<WorkoutHistory />} />
          <Route path="personal-records" element={<PersonalRecords />} />
          <Route path="progress" element={<UserDashboard />} /> {/* TODO: Progress page */}
          <Route path="profile" element={<UserDashboard />} /> {/* TODO: Profile page */}
        </Route>

        {/* Trainer Routes (Protected - Trainer and Admin) */}
        <Route
          path="/trainer"
          element={
            <AuthGuard requiredRole="trainer">
              <TrainerLayout />
            </AuthGuard>
          }
        >
          <Route index element={<TrainerDashboard />} />
          <Route path="trainee/:id" element={<TraineeDetail />} />
          <Route path="trainee/:id/messages" element={<TraineeDetail />} />
          <Route path="program/new" element={<ProgramBuilder />} />
          <Route path="program/:id/edit" element={<ProgramBuilder />} />
        </Route>

        {/* Admin Routes (Protected - Admin only) */}
        <Route
          path="/admin"
          element={
            <AuthGuard requiredRole="admin">
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="exercises" replace />} />
          <Route path="exercises" element={<ExerciseList />} />
          <Route path="exercises/new" element={<ExerciseForm />} />
          <Route path="exercises/:id/edit" element={<ExerciseForm />} />
          <Route path="muscles" element={<MuscleManager />} />
          <Route path="equipment" element={<EquipmentManager />} />
          <Route path="band-types" element={<BandTypeManager />} />
          <Route path="exercise-sets" element={<ExerciseSetManager />} />
          <Route path="report-types" element={<ReportTypeManager />} />
          <Route path="users" element={<UsersList />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </>
  )
}

export default App
