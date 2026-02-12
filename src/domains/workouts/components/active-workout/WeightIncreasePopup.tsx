/**
 * WeightIncreasePopup
 * Celebratory popup when trainee increases weight above last workout performance.
 * Fully self-contained - does not touch any existing logic.
 */

import { useEffect, useRef, useState } from 'react'

interface WeightIncreasePopupProps {
  isVisible: boolean
  oldWeight: number
  newWeight: number
  onDone: () => void
}

// Generate random confetti pieces
function generateConfetti(count: number) {
  const colors = ['#FCD34D', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981', '#EC4899', '#F97316']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    size: 6 + Math.random() * 6,
  }))
}

// Generate sparkle positions in a ring
function generateSparkles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360
    const rad = (angle * Math.PI) / 180
    return {
      id: i,
      x: Math.cos(rad) * 80,
      y: Math.sin(rad) * 80,
      delay: i * 0.05,
    }
  })
}

// Generate burst emoji positions
function generateBurstEmojis(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360
    const rad = (angle * Math.PI) / 180
    return {
      id: i,
      x: Math.cos(rad) * 120,
      y: Math.sin(rad) * 120,
      delay: 0.1 + i * 0.04,
    }
  })
}

const confettiPieces = generateConfetti(40)
const sparkles = generateSparkles(12)
const burstEmojis = generateBurstEmojis(8)

export function WeightIncreasePopup({ isVisible, oldWeight, newWeight, onDone }: WeightIncreasePopupProps) {
  const [phase, setPhase] = useState<'enter' | 'exit' | 'hidden'>('hidden')
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (isVisible) {
      setPhase('enter')
      const exitTimer = setTimeout(() => setPhase('exit'), 2000)
      const hideTimer = setTimeout(() => {
        setPhase('hidden')
        onDoneRef.current()
      }, 2500)
      return () => {
        clearTimeout(exitTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [isVisible])

  if (phase === 'hidden') return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center ${
        phase === 'exit' ? 'animate-wip-fade-out' : ''
      }`}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="absolute animate-wip-confetti-fall"
            style={{
              left: `${piece.left}%`,
              top: '-20px',
              width: `${piece.size}px`,
              height: `${piece.size * 0.6}px`,
              backgroundColor: piece.color,
              borderRadius: '2px',
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
      </div>

      {/* Center content */}
      <div className="relative flex flex-col items-center animate-wip-pop-in">
        {/* Sparkles ring */}
        {sparkles.map((spark) => (
          <div
            key={spark.id}
            className="absolute animate-wip-sparkle"
            style={{
              transform: `translate(${spark.x}px, ${spark.y}px)`,
              animationDelay: `${spark.delay}s`,
            }}
          >
            <div className="w-2 h-2 rounded-full bg-yellow-300 shadow-[0_0_6px_2px_rgba(252,211,77,0.6)]" />
          </div>
        ))}

        {/* Burst clapping emojis */}
        {burstEmojis.map((emoji) => (
          <div
            key={emoji.id}
            className="absolute animate-wip-burst text-2xl"
            style={{
              '--burst-x': `${emoji.x}px`,
              '--burst-y': `${emoji.y}px`,
              animationDelay: `${emoji.delay}s`,
            } as React.CSSProperties}
          >
            👏
          </div>
        ))}

        {/* Main clapping emoji */}
        <div className="animate-wip-clap text-[72px] leading-none">
          👏
        </div>

        {/* Text */}
        <div className="animate-wip-slide-up mt-4">
          <div className="text-3xl font-black text-center text-yellow-300 wip-glow-text">
            כל הכבוד!
          </div>
          <div className="text-lg font-bold text-center mt-1 text-yellow-200">
            💪 עלית במשקל!
          </div>
        </div>

        {/* Weight badge */}
        <div dir="ltr" className="animate-wip-badge-in mt-4 flex items-center gap-2 py-2 px-5 rounded-full bg-yellow-300/15 border border-yellow-300/40">
          <span className="text-lg font-bold text-yellow-200">
            {oldWeight}kg
          </span>
          <span className="text-lg text-yellow-300">→</span>
          <span className="text-xl font-black text-yellow-300">
            {newWeight}kg
          </span>
        </div>
      </div>
    </div>
  )
}
