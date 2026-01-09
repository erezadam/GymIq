import { useState } from 'react'

interface MuscleIconProps {
  icon: string        // URL לתמונה או אימוג'י (fallback)
  size?: number       // 24 | 32 | 48 | 64
  className?: string
}

/**
 * קומפוננטה להצגת אייקון שריר
 * תומכת ב-URL לתמונה או אימוג'י כ-fallback
 */
export function MuscleIcon({ icon, size = 48, className = '' }: MuscleIconProps) {
  const [imageError, setImageError] = useState(false)

  // בדיקה אם זה URL תקין
  const isUrl = icon && (icon.startsWith('http://') || icon.startsWith('https://'))

  // אם אין אייקון, או שיש שגיאה בטעינת תמונה, או שזה לא URL - הצג אימוג'י
  if (!icon || imageError || !isUrl) {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.6 }}
      >
        {icon && !isUrl ? icon : '💪'}
      </span>
    )
  }

  return (
    <img
      src={icon}
      alt="muscle icon"
      className={`object-cover rounded-lg ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
      onError={() => setImageError(true)}
    />
  )
}

export default MuscleIcon
