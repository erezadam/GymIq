/**
 * RestTimer Component
 * Circular progress timer for rest between sets
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, SkipForward } from 'lucide-react'

interface RestTimerProps {
  targetSeconds: number
  startedAt?: Date
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
  onChangeTime: (seconds: number) => void
}

const REST_TIME_OPTIONS = [30, 60, 90, 120, 180, 240]

export function RestTimer({
  targetSeconds,
  startedAt,
  isActive,
  onComplete,
  onSkip,
  onChangeTime,
}: RestTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(targetSeconds)
  const [showTimeSelector, setShowTimeSelector] = useState(false)
  const animationRef = useRef<number>()
  const circleRef = useRef<SVGCircleElement>(null)

  // Circle dimensions
  const size = 140
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60)
    const secs = Math.abs(seconds) % 60
    const sign = seconds < 0 ? '+' : ''
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress (0 to 1)
  const progress = Math.max(0, Math.min(1, remainingSeconds / targetSeconds))
  const strokeDashoffset = circumference * (1 - progress)

  // Timer animation using requestAnimationFrame
  const updateTimer = useCallback(() => {
    if (!isActive || !startedAt) return

    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
    const remaining = targetSeconds - elapsed

    setRemainingSeconds(remaining)

    if (remaining <= 0) {
      onComplete()
      return
    }

    animationRef.current = requestAnimationFrame(updateTimer)
  }, [isActive, startedAt, targetSeconds, onComplete])

  useEffect(() => {
    if (isActive && startedAt) {
      animationRef.current = requestAnimationFrame(updateTimer)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, startedAt, updateTimer])

  // Reset remaining when target changes
  useEffect(() => {
    setRemainingSeconds(targetSeconds)
  }, [targetSeconds])

  if (!isActive) return null

  const isOvertime = remainingSeconds < 0

  return (
    <div className="rest-timer-container">
      <div className="rest-timer-content">
        {/* Skip Button */}
        <button onClick={onSkip} className="rest-timer-skip">
          <SkipForward className="w-5 h-5" />
          דלג
        </button>

        {/* Circular Timer */}
        <div className="rest-timer-circle-wrapper">
          <svg width={size} height={size} className="rest-timer-svg">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-neon-gray-700"
            />
            {/* Progress circle */}
            <circle
              ref={circleRef}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={isOvertime ? 'var(--color-status-error)' : 'var(--color-workout-timer)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={isOvertime ? 0 : strokeDashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-200"
            />
          </svg>
          {/* Timer display */}
          <div className="rest-timer-display">
            <span className={`text-4xl font-bold ${isOvertime ? 'text-status-error-text' : 'text-white'}`}>
              {formatTime(remainingSeconds)}
            </span>
          </div>
        </div>

        {/* Target Time Button */}
        <button
          onClick={() => setShowTimeSelector(!showTimeSelector)}
          className="rest-timer-target"
        >
          <Clock className="w-4 h-4" />
          {formatTime(targetSeconds)}
        </button>
      </div>

      {/* Rest time label */}
      <p className="text-neon-gray-400 text-sm text-center mt-4">זמן מנוחה עד לסט הבא</p>

      {/* Time Selector Modal */}
      {showTimeSelector && (
        <div className="rest-timer-selector-backdrop" onClick={() => setShowTimeSelector(false)}>
          <div className="rest-timer-selector" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-4 text-center">בחר זמן מנוחה</h3>
            <div className="grid grid-cols-3 gap-2">
              {REST_TIME_OPTIONS.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => {
                    onChangeTime(seconds)
                    setShowTimeSelector(false)
                  }}
                  className={`py-3 rounded-lg font-medium transition-all ${
                    seconds === targetSeconds
                      ? 'bg-neon-cyan text-neon-dark'
                      : 'bg-neon-gray-700 text-white hover:bg-neon-gray-600'
                  }`}
                >
                  {formatTime(seconds)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RestTimer
