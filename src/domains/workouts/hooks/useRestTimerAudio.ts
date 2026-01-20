/**
 * useRestTimerAudio
 * Hook for managing rest timer audio alerts
 *
 * Two modes:
 * - 'minute_end' (default): Single 3-second beep at the end of each minute
 * - 'countdown_10s': Beeps in last 10 seconds of each minute (50-59)
 *
 * Settings persisted to localStorage
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// Alert mode types
export type AlertMode = 'minute_end' | 'countdown_10s'

// Types
export interface RestTimerAudioSettings {
  enabled: boolean
  volume: number // 0-100
  alertMode: AlertMode
}

// Storage key
const STORAGE_KEY = 'gymiq_timer_audio_settings'

// Default settings - minute_end is the default
const DEFAULT_SETTINGS: RestTimerAudioSettings = {
  enabled: true,
  volume: 70,
  alertMode: 'minute_end',
}

// Load settings from localStorage
const loadSettings = (): RestTimerAudioSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn('Failed to load audio settings:', e)
  }
  return DEFAULT_SETTINGS
}

// Save settings to localStorage
const saveSettings = (settings: RestTimerAudioSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Failed to save audio settings:', e)
  }
}

export function useRestTimerAudio() {
  const [settings, setSettings] = useState<RestTimerAudioSettings>(loadSettings)
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastPlayedSecondRef = useRef<number>(-1)
  const longBeepOscillatorRef = useRef<OscillatorNode | null>(null)

  // Save settings when they change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Initialize AudioContext (required for iOS - must be called after user interaction)
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log('🔊 AudioContext initialized')
      } catch (e) {
        console.warn('Failed to create AudioContext:', e)
      }
    }
    // Resume if suspended (iOS requirement)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  // Get or create AudioContext
  const getAudioContext = useCallback((): AudioContext | null => {
    if (!audioContextRef.current) {
      initAudioContext()
    }
    return audioContextRef.current
  }, [initAudioContext])

  // Play a short beep sound
  const playBeep = useCallback((frequency: number, duration: number, volumeMultiplier = 1) => {
    if (!settings.enabled) return

    const ctx = getAudioContext()
    if (!ctx) return

    try {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      // Apply volume (settings.volume is 0-100, gain is 0-1)
      const gain = (settings.volume / 100) * 0.4 * volumeMultiplier
      gainNode.gain.setValueAtTime(gain, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch (e) {
      console.warn('Failed to play beep:', e)
    }
  }, [settings.enabled, settings.volume, getAudioContext])

  // Play long beep for minute end (3 seconds with fade out)
  const playLongMinuteBeep = useCallback(() => {
    if (!settings.enabled) return

    const ctx = getAudioContext()
    if (!ctx) return

    try {
      // Stop any existing long beep
      if (longBeepOscillatorRef.current) {
        try {
          longBeepOscillatorRef.current.stop()
        } catch (e) {
          // Already stopped
        }
      }

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = 700 // Medium-high pitch
      oscillator.type = 'sine'

      // Apply volume with longer fade
      const gain = (settings.volume / 100) * 0.35
      gainNode.gain.setValueAtTime(gain, ctx.currentTime)
      // Sustain for 2 seconds, then fade out over 1 second
      gainNode.gain.setValueAtTime(gain, ctx.currentTime + 2)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 3)

      longBeepOscillatorRef.current = oscillator
    } catch (e) {
      console.warn('Failed to play long minute beep:', e)
    }
  }, [settings.enabled, settings.volume, getAudioContext])

  // Tick sound for countdown (last 10 seconds of each minute)
  const playTickSound = useCallback(() => {
    playBeep(800, 0.08)
  }, [playBeep])

  // Short minute complete sound (two-tone chime) for countdown mode
  const playShortMinuteComplete = useCallback(() => {
    if (!settings.enabled) return

    const ctx = getAudioContext()
    if (!ctx) return

    try {
      // First tone
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.frequency.value = 600
      osc1.type = 'sine'
      const volume = (settings.volume / 100) * 0.5
      gain1.gain.setValueAtTime(volume, ctx.currentTime)
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc1.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 0.15)

      // Second tone (higher, slightly delayed)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.frequency.value = 800
      osc2.type = 'sine'
      gain2.gain.setValueAtTime(volume, ctx.currentTime + 0.15)
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
      osc2.start(ctx.currentTime + 0.15)
      osc2.stop(ctx.currentTime + 0.35)
    } catch (e) {
      console.warn('Failed to play short minute complete sound:', e)
    }
  }, [settings.enabled, settings.volume, getAudioContext])

  // Check and play appropriate sound based on elapsed seconds
  // Call this every second from the timer component
  const checkAndPlaySound = useCallback((elapsedSeconds: number) => {
    if (!settings.enabled) return

    // Prevent playing same second twice
    if (elapsedSeconds === lastPlayedSecondRef.current) return
    lastPlayedSecondRef.current = elapsedSeconds

    const secondsInMinute = elapsedSeconds % 60

    // Minute complete (at 60, 120, 180, etc.)
    if (secondsInMinute === 0 && elapsedSeconds > 0) {
      if (settings.alertMode === 'minute_end') {
        // Long 3-second beep for minute_end mode
        playLongMinuteBeep()
      } else {
        // Short two-tone chime for countdown mode
        playShortMinuteComplete()
      }
      return
    }

    // Last 10 seconds of each minute (50-59) - only in countdown mode
    if (settings.alertMode === 'countdown_10s' && secondsInMinute >= 50) {
      playTickSound()
    }
  }, [settings.enabled, settings.alertMode, playTickSound, playLongMinuteBeep, playShortMinuteComplete])

  // Update settings
  const updateSettings = useCallback((updates: Partial<RestTimerAudioSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  // Toggle enabled
  const toggleEnabled = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  // Set volume
  const setVolume = useCallback((volume: number) => {
    setSettings(prev => ({ ...prev, volume: Math.max(0, Math.min(100, volume)) }))
  }, [])

  // Set alert mode
  const setAlertMode = useCallback((alertMode: AlertMode) => {
    setSettings(prev => ({ ...prev, alertMode }))
  }, [])

  // Test sound (for settings UI) - plays current mode sound
  const playTestSound = useCallback(() => {
    if (settings.alertMode === 'minute_end') {
      playLongMinuteBeep()
    } else {
      playBeep(800, 0.15, 1)
    }
  }, [settings.alertMode, playLongMinuteBeep, playBeep])

  return {
    settings,
    updateSettings,
    toggleEnabled,
    setVolume,
    setAlertMode,
    initAudioContext,
    checkAndPlaySound,
    playTickSound,
    playLongMinuteBeep,
    playShortMinuteComplete,
    playTestSound,
  }
}

export default useRestTimerAudio
