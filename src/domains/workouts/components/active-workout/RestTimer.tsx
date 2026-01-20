/**
 * RestTimer
 * Floating rest timer that appears after adding a set
 * With audio alerts - two modes available:
 * - minute_end (default): 3-second beep at end of each minute
 * - countdown_10s: Beeps in last 10 seconds of each minute
 */

import { useState, useEffect, useRef } from 'react'
import { Timer, Volume2, VolumeX, Settings } from 'lucide-react'
import { useRestTimerAudio } from '../../hooks/useRestTimerAudio'

interface RestTimerProps {
  isVisible: boolean
  onClose: () => void
  /** Unique key to reset the timer */
  resetKey: number
}

export function RestTimer({ isVisible, onClose, resetKey }: RestTimerProps) {
  const [seconds, setSeconds] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const lastSecondRef = useRef<number>(-1)

  const {
    settings,
    toggleEnabled,
    setVolume,
    setAlertMode,
    checkAndPlaySound,
    playTestSound,
    initAudioContext,
  } = useRestTimerAudio()

  // Reset timer when resetKey changes
  useEffect(() => {
    setSeconds(0)
    lastSecondRef.current = -1
  }, [resetKey])

  // Count up and check for audio alerts
  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setSeconds((prev) => {
        const newSeconds = prev + 1
        // Check and play sound for this second
        checkAndPlaySound(newSeconds)
        return newSeconds
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible, resetKey, checkAndPlaySound])

  // Initialize audio context on first visibility (user interaction)
  useEffect(() => {
    if (isVisible) {
      initAudioContext()
    }
  }, [isVisible, initAudioContext])

  // Format time MM:SS
  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Check if we're in the alert zone based on mode
  const secondsInMinute = seconds % 60
  const isCountdownAlertZone = settings.alertMode === 'countdown_10s' && secondsInMinute >= 50
  const isMinuteEndAlertZone = secondsInMinute === 0 && seconds > 0
  const isAlertZone = isCountdownAlertZone || isMinuteEndAlertZone

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-neon-gray-800 border-2 border-primary-400 rounded-xl p-6
                   min-w-[280px] text-center shadow-glow-cyan relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Settings button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-3 right-3 p-2 rounded-lg hover:bg-neon-gray-700 transition-colors"
          aria-label="הגדרות צלילים"
        >
          <Settings size={18} className="text-neon-gray-400" />
        </button>

        {/* Sound status indicator */}
        <button
          onClick={toggleEnabled}
          className="absolute top-3 left-3 p-2 rounded-lg hover:bg-neon-gray-700 transition-colors"
          aria-label={settings.enabled ? 'השתק צלילים' : 'הפעל צלילים'}
        >
          {settings.enabled ? (
            <Volume2 size={18} className="text-primary-400" />
          ) : (
            <VolumeX size={18} className="text-neon-gray-500" />
          )}
        </button>

        {/* Time display */}
        <div
          className={`text-5xl font-bold font-mono transition-colors ${
            isAlertZone && settings.enabled ? 'text-accent-orange animate-pulse' : 'text-primary-400'
          }`}
        >
          {formatTime(seconds)}
        </div>

        {/* Rest label with icon */}
        <div className="text-sm text-neon-gray-400 mt-2 flex items-center justify-center gap-2">
          <Timer size={16} />
          <span>מנוחה</span>
        </div>

        {/* Audio indicator - different message based on mode */}
        {settings.enabled && seconds > 0 && (
          <>
            {/* Countdown mode: show seconds remaining */}
            {settings.alertMode === 'countdown_10s' && secondsInMinute >= 50 && (
              <div className="text-xs text-accent-orange mt-2">
                🔔 {60 - secondsInMinute} שניות לסיום הדקה
              </div>
            )}
            {/* Minute end mode: show when approaching minute end */}
            {settings.alertMode === 'minute_end' && secondsInMinute >= 55 && (
              <div className="text-xs text-accent-orange mt-2">
                🔔 צפצוף בעוד {60 - secondsInMinute} שניות
              </div>
            )}
          </>
        )}

        {/* Close instruction */}
        <div
          className="text-xs text-neon-gray-500 mt-3 cursor-pointer hover:text-neon-gray-300"
          onClick={onClose}
        >
          לחץ לסגירה
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div
            className="absolute top-14 right-2 bg-neon-gray-900 border border-neon-gray-700
                       rounded-lg p-4 shadow-xl min-w-[220px] text-right z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-medium text-white mb-3">הגדרות צלילים</h4>

            {/* Enable/Disable toggle */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-neon-gray-300">צלילים</span>
              <button
                onClick={toggleEnabled}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.enabled ? 'bg-primary-500' : 'bg-neon-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.enabled ? 'right-1' : 'right-7'
                  }`}
                />
              </button>
            </div>

            {/* Alert Mode Selection */}
            <div className="mb-3">
              <span className="text-sm text-neon-gray-300 block mb-2">סוג התראה</span>
              <div className="space-y-2">
                <div
                  onClick={() => setAlertMode('minute_end')}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    settings.alertMode === 'minute_end'
                      ? 'bg-primary-500/20 border border-primary-500'
                      : 'bg-neon-gray-800 border border-transparent hover:bg-neon-gray-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    settings.alertMode === 'minute_end' ? 'border-primary-400' : 'border-neon-gray-500'
                  }`}>
                    {settings.alertMode === 'minute_end' && (
                      <div className="w-2 h-2 rounded-full bg-primary-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-white">צפצוף בסיום דקה</span>
                    <span className="text-xs text-neon-gray-500 block">צליל ארוך (3 שניות)</span>
                  </div>
                </div>

                <div
                  onClick={() => setAlertMode('countdown_10s')}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    settings.alertMode === 'countdown_10s'
                      ? 'bg-primary-500/20 border border-primary-500'
                      : 'bg-neon-gray-800 border border-transparent hover:bg-neon-gray-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    settings.alertMode === 'countdown_10s' ? 'border-primary-400' : 'border-neon-gray-500'
                  }`}>
                    {settings.alertMode === 'countdown_10s' && (
                      <div className="w-2 h-2 rounded-full bg-primary-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-white">ספירה לאחור</span>
                    <span className="text-xs text-neon-gray-500 block">10 צפצופים לפני סיום דקה</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Volume slider */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-neon-gray-300">עוצמה</span>
                <span className="text-xs text-neon-gray-500">{settings.volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-2 bg-neon-gray-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-primary-400"
                disabled={!settings.enabled}
              />
            </div>

            {/* Test sound button */}
            <button
              onClick={playTestSound}
              disabled={!settings.enabled}
              className="w-full py-2 px-3 bg-neon-gray-700 hover:bg-neon-gray-600
                         disabled:opacity-50 disabled:cursor-not-allowed
                         rounded-lg text-sm text-white transition-colors"
            >
              🔊 בדוק צליל
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
