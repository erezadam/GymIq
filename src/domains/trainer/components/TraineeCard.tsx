import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, CalendarDays, CircleAlert, AlertTriangle, CheckCircle, Mail, Loader2, Check } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/lib/firebase/config'
import type { TraineeWithStats } from '../types'
import { TRAINING_GOAL_LABELS } from '../types'
import { TraineeAvatar } from './TraineeAvatar'

const functions = getFunctions(app)

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

function getMemberDuration(date: Date | any): string {
  const d = date instanceof Date ? date : date?.toDate?.() || new Date(date)
  const months = Math.floor(daysSince(d) / 30)
  if (months < 1) return 'חדש'
  if (months === 1) return 'חודש'
  return `${months} חודשים`
}

interface TraineeCardProps {
  trainee: TraineeWithStats
}

export function TraineeCard({ trainee }: TraineeCardProps) {
  const navigate = useNavigate()
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const {
    relationship,
    traineeProfile,
    lastWorkoutDate,
    thisWeekWorkouts,
    currentStreak,
    activeProgram,
  } = trainee

  const handleResendEmail = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (emailStatus === 'sending' || emailStatus === 'sent') return

    setEmailStatus('sending')
    try {
      const sendWelcomeEmail = httpsCallable(functions, 'sendWelcomeEmail')
      await sendWelcomeEmail({
        traineeEmail: relationship.traineeEmail,
        traineeName: relationship.traineeName,
        trainerName: relationship.trainerName,
      })
      setEmailStatus('sent')
      setTimeout(() => setEmailStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to resend welcome email:', error)
      setEmailStatus('error')
      setTimeout(() => setEmailStatus('idle'), 3000)
    }
  }

  const displayName = traineeProfile
    ? `${traineeProfile.firstName} ${traineeProfile.lastName}`
    : relationship.traineeName

  const getDotColor = () => {
    if (thisWeekWorkouts >= 3) return 'bg-status-success'
    if (thisWeekWorkouts >= 1) return 'bg-status-warning'
    if (!lastWorkoutDate || daysSince(lastWorkoutDate) > 5) return 'bg-status-error'
    return 'bg-status-info'
  }

  const dotColor = getDotColor()
  const goalLabel = traineeProfile?.trainingGoals?.[0]
    ? TRAINING_GOAL_LABELS[traineeProfile.trainingGoals[0]]
    : undefined
  const memberDuration = getMemberDuration(relationship.createdAt)

  const needsAttention =
    !lastWorkoutDate || (lastWorkoutDate && daysSince(lastWorkoutDate) > 5 && thisWeekWorkouts === 0)

  return (
    <div
      onClick={() => navigate(`/trainer/trainee/${relationship.traineeId}`)}
      className={`bg-dark-card border rounded-2xl p-4 transition-all cursor-pointer shadow-card hover:shadow-card-hover ${
        needsAttention ? 'border-accent-orange/20 hover:border-accent-orange/40' : 'border-white/5 hover:border-white/10'
      }`}
    >
      {/* Needs attention badge */}
      {needsAttention && (
        <div className="flex justify-center mb-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent-orange/40 text-accent-orange text-xs">
            דורש תשומת לב
            <CircleAlert className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Name + Avatar row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Name - first child = start = RIGHT in RTL */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-text-primary truncate">{displayName}</h3>
          <p className="text-text-secondary text-xs truncate">
            {goalLabel && <>{goalLabel} &middot; </>}
            {memberDuration}
          </p>
        </div>

        {/* Avatar - second child = end = LEFT in RTL */}
        <div className="relative flex-shrink-0">
          <TraineeAvatar
            traineeId={relationship.traineeId}
            displayName={displayName}
            photoURL={traineeProfile?.photoURL}
            sizeClass="w-14 h-14"
            roundedClass="rounded-2xl"
            textSizeClass="text-xl"
          />
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 ${dotColor} rounded-full border-2 border-dark-card z-10`}
          />
        </div>
      </div>

      {/* Program status */}
      <div className="mb-3">
        {activeProgram ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-status-success" />
            <span className="text-xs text-status-success">פעיל</span>
            <span className="text-xs text-text-secondary truncate">{activeProgram.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
            <span className="text-xs text-status-warning">אין תוכנית פעילה</span>
          </div>
        )}
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 gap-2">
        {/* First grid item = RIGHT column in RTL = השבוע */}
        <div className="bg-dark-surface border border-white/10 rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-secondary text-xs">השבוע</span>
            <CalendarDays className="w-3.5 h-3.5 text-text-secondary" />
          </div>
          <p className="text-lg font-bold text-text-primary">{thisWeekWorkouts}/3</p>
        </div>
        {/* Second grid item = LEFT column in RTL = רצף ימים */}
        <div className="bg-dark-surface border border-white/10 rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-secondary text-xs">רצף ימים</span>
            <Flame className="w-3.5 h-3.5 text-accent-orange" />
          </div>
          <p className="text-lg font-bold text-text-primary">{currentStreak}</p>
        </div>
      </div>

      {/* Resend welcome email */}
      <button
        onClick={handleResendEmail}
        disabled={emailStatus === 'sending' || emailStatus === 'sent'}
        className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
          emailStatus === 'sent'
            ? 'bg-status-success/10 text-status-success border border-status-success/30'
            : emailStatus === 'error'
              ? 'bg-status-error/10 text-status-error border border-status-error/30'
              : 'bg-dark-surface border border-white/10 text-text-secondary hover:text-primary-main hover:border-primary-main/30'
        }`}
      >
        {emailStatus === 'sending' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {emailStatus === 'sent' && <Check className="w-3.5 h-3.5" />}
        {emailStatus === 'error' && <Mail className="w-3.5 h-3.5" />}
        {emailStatus === 'idle' && <Mail className="w-3.5 h-3.5" />}
        {emailStatus === 'sending' ? 'שולח...' : emailStatus === 'sent' ? 'נשלח בהצלחה!' : emailStatus === 'error' ? 'שגיאה, נסה שוב' : 'שלח מייל כניסה'}
      </button>
    </div>
  )
}
