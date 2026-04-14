import { Smartphone, Monitor } from 'lucide-react'
import { useUIStore } from '@/shared/store/uiStore'
import { colors, borderRadius } from '@/styles/theme'

/**
 * Button that toggles the global "mobile preview" mode. When active, every
 * layout wraps its content in a phone-shaped frame via <MobilePreviewFrame>.
 * Include this in each layout's header so the user can toggle from anywhere.
 */
export function MobilePreviewToggle() {
  const mobilePreview = useUIStore((s) => s.mobilePreview)
  const toggleMobilePreview = useUIStore((s) => s.toggleMobilePreview)

  return (
    <button
      type="button"
      onClick={toggleMobilePreview}
      title={mobilePreview ? 'תצוגה מלאה' : 'תצוגת טלפון'}
      aria-label={mobilePreview ? 'תצוגה מלאה' : 'תצוגת טלפון'}
      aria-pressed={mobilePreview}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.md,
        border: `1px solid ${colors.border.default}`,
        background: mobilePreview ? colors.primary.main : 'transparent',
        color: mobilePreview ? colors.text.inverse : colors.text.secondary,
        cursor: 'pointer',
        transition: '0.2s ease',
      }}
    >
      {mobilePreview ? <Monitor size={18} /> : <Smartphone size={18} />}
    </button>
  )
}
