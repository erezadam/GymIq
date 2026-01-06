/**
 * RestTimer
 * Floating rest timer that appears after adding a set
 */

import { useState, useEffect } from 'react'
import { Timer } from 'lucide-react'

interface RestTimerProps {
  isVisible: boolean
  onClose: () => void
  /** Unique key to reset the timer */
  resetKey: number
}

export function RestTimer({ isVisible, onClose, resetKey }: RestTimerProps) {
  const [seconds, setSeconds] = useState(0)

  // Reset timer when resetKey changes
  useEffect(() => {
    setSeconds(0)
  }, [resetKey])

  // Count up
  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible, resetKey])

  // Format time MM:SS
  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-neon-gray-800 border-2 border-primary-400 rounded-xl p-6
                   min-w-[280px] text-center shadow-glow-cyan
                   active:bg-neon-gray-700 transition-colors cursor-pointer"
        onClick={onClose}
      >
        {/* Time display */}
        <div className="text-5xl font-bold text-primary-400 font-mono">
          {formatTime(seconds)}
        </div>

        {/* Rest label with icon */}
        <div className="text-sm text-neon-gray-400 mt-2 flex items-center justify-center gap-2">
          <Timer size={16} />
          <span>מנוחה</span>
        </div>

        {/* Close instruction */}
        <div className="text-xs text-neon-gray-500 mt-3">
          לחץ לסגירה
        </div>
      </div>
    </div>
  )
}
