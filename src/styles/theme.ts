/**
 * GymIQ Design System
 *
 * קובץ עיצוב מרכזי - כל הסגנונות מוגדרים כאן
 * הקומפוננטות מפנות לקובץ זה ולא מגדירות סגנונות בעצמן
 *
 * Updated: January 2026
 */

// ============================================
// BASE TOKENS - ערכי בסיס
// ============================================

export const colors = {
  // Background
  background: {
    main: '#0a0f14',
    card: '#1a2632',
    elevated: '#1f2937',
    input: '#0d1117',
  },

  // Primary - Cyan/Teal
  primary: {
    main: '#2dd4bf',
    light: '#5eead4',
    dark: '#14b8a6',
  },

  // Secondary
  secondary: {
    main: '#1e2836',
    light: '#2a3544',
    dark: '#141c24',
  },

  // Accent Colors
  accent: {
    orange: '#FF6B35',
    gold: '#C4A052',
    cyan: '#2dd4bf',
    purple: '#8B5CF6',
    pink: '#EC4899',
    blue: '#3B82F6',
    green: '#10B981',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#6b7b8a',
    muted: '#4b5563',
    disabled: '#374151',
    inverse: '#0a0f14',
  },

  // Borders
  border: {
    default: '#1e2836',
    light: '#374151',
    focus: '#2dd4bf',
  },

  // Status
  status: {
    success: '#10B981',
    warning: '#FFB020',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    primary: "'Heebo', 'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const shadows = {
  sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
  md: '0 4px 8px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
  card: '0 6px 24px rgba(0, 0, 0, 0.5)',
  glow: {
    cyan: '0 8px 32px rgba(45, 212, 191, 0.35)',
    orange: '0 0 12px rgba(255, 107, 53, 0.5)',
    gold: '0 0 12px rgba(196, 160, 82, 0.4)',
    purple: '0 0 12px rgba(139, 92, 246, 0.4)',
  },
} as const;

export const transitions = {
  fast: '0.1s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
} as const;

// ============================================
// COMPONENT STYLES - סגנונות קומפוננטות
// ============================================

export const components = {
  // ==========================================
  // CARDS
  // ==========================================
  cards: {
    // כרטיס סטטיסטיקה קטן
    statCard: {
      base: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: `${spacing.lg}px ${spacing.md}px`,
        textAlign: 'center' as const,
      },
      variants: {
        streak: {
          background: `linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 107, 53, 0.05) 100%)`,
          border: `1px solid rgba(255, 107, 53, 0.2)`,
          iconBg: 'rgba(255, 107, 53, 0.2)',
          valueColor: colors.accent.orange,
        },
        weekly: {
          background: `linear-gradient(135deg, rgba(196, 160, 82, 0.15) 0%, rgba(196, 160, 82, 0.05) 100%)`,
          border: `1px solid rgba(196, 160, 82, 0.2)`,
          iconBg: 'rgba(196, 160, 82, 0.2)',
          valueColor: colors.accent.gold,
        },
        total: {
          background: `linear-gradient(135deg, rgba(45, 212, 191, 0.15) 0%, rgba(45, 212, 191, 0.05) 100%)`,
          border: `1px solid rgba(45, 212, 191, 0.2)`,
          iconBg: 'rgba(45, 212, 191, 0.2)',
          valueColor: colors.primary.main,
        },
      },
      icon: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.sm,
      },
      value: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
      },
      label: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
      },
    },

    // כרטיס פעולה (תוכניות אימונים)
    actionCard: {
      base: {
        background: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        border: `1px solid rgba(255,255,255,0.05)`,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.lg,
        cursor: 'pointer',
      },
      icon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
      },
      iconVariants: {
        purple: { background: 'rgba(139, 92, 246, 0.15)' },
        blue: { background: 'rgba(59, 130, 246, 0.15)' },
        cyan: { background: 'rgba(45, 212, 191, 0.15)' },
        orange: { background: 'rgba(255, 107, 53, 0.15)' },
      },
      title: {
        color: colors.text.primary,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.xs,
      },
      subtitle: {
        color: colors.text.secondary,
        fontSize: typography.fontSize.sm,
      },
      arrow: {
        color: colors.text.secondary,
        fontSize: 20,
      },
    },
  },

  // ==========================================
  // BUTTONS
  // ==========================================
  buttons: {
    // כפתור CTA ראשי
    primaryCTA: {
      base: {
        background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 50%, #0d9488 100%)`,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        position: 'relative' as const,
        overflow: 'hidden',
        boxShadow: shadows.glow.cyan,
        cursor: 'pointer',
      },
      content: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.lg,
        position: 'relative' as const,
        zIndex: 1,
      },
      icon: {
        width: 56,
        height: 56,
        background: 'rgba(255,255,255,0.2)',
        borderRadius: borderRadius.lg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        fontSize: 28,
      },
      title: {
        color: colors.text.inverse,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        marginBottom: spacing.xs,
      },
      subtitle: {
        color: 'rgba(10, 15, 20, 0.7)',
        fontSize: typography.fontSize.sm,
      },
      arrow: {
        width: 36,
        height: 36,
        background: 'rgba(10, 15, 20, 0.15)',
        borderRadius: borderRadius.sm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      // אפקט רקע
      bgBlur: {
        circle1: {
          position: 'absolute' as const,
          top: -20,
          left: -20,
          width: 100,
          height: 100,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          filter: 'blur(20px)',
        },
        circle2: {
          position: 'absolute' as const,
          bottom: -30,
          right: 20,
          width: 80,
          height: 80,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50%',
          filter: 'blur(15px)',
        },
      },
    },

    // כפתור משני
    secondary: {
      base: {
        background: colors.secondary.main,
        borderRadius: borderRadius.lg,
        padding: `${spacing.md}px ${spacing.lg}px`,
        border: `1px solid ${colors.border.default}`,
        color: colors.text.primary,
        cursor: 'pointer',
      },
    },

    // כפתור פילטר
    filter: {
      base: {
        borderRadius: borderRadius.full,
        padding: `${spacing.sm}px ${spacing.lg}px`,
        border: 'none',
        cursor: 'pointer',
        transition: transitions.normal,
      },
      active: {
        background: colors.primary.main,
        color: colors.text.inverse,
        boxShadow: '0 4px 16px rgba(45, 212, 191, 0.4)',
      },
      inactive: {
        background: colors.secondary.main,
        color: colors.text.primary,
      },
    },
  },

  // ==========================================
  // LAYOUT
  // ==========================================
  layout: {
    // Header
    header: {
      container: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${spacing.sm}px ${spacing.xl}px ${spacing.lg}px`,
      },
      menuButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        background: 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      logo: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        letterSpacing: 1,
      },
      logoAccent: {
        color: colors.primary.main,
      },
      logoIcon: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.sm,
        background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
        boxShadow: '0 4px 16px rgba(45, 212, 191, 0.4)',
      },
    },

    // Greeting section
    greeting: {
      container: {
        textAlign: 'center' as const,
        marginBottom: spacing.xl,
      },
      title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
      },
      nameHighlight: {
        color: colors.primary.main,
      },
      subtitle: {
        color: colors.text.secondary,
        fontSize: typography.fontSize.base,
      },
    },

    // Stats row
    statsRow: {
      display: 'flex',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },

    // Bottom navigation
    bottomNav: {
      container: {
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: `${spacing.md}px ${spacing.xl}px ${spacing['2xl']}px`,
        background: colors.background.input,
        borderTop: `1px solid rgba(255,255,255,0.05)`,
      },
      item: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: spacing.xs,
        cursor: 'pointer',
      },
      icon: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.sm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
      },
      iconActive: {
        background: 'rgba(45, 212, 191, 0.15)',
      },
      label: {
        fontSize: typography.fontSize.xs,
      },
      labelActive: {
        color: colors.primary.main,
        fontWeight: typography.fontWeight.semibold,
      },
      labelInactive: {
        color: colors.text.secondary,
        fontWeight: typography.fontWeight.normal,
      },
    },

    // Screen container
    screen: {
      base: {
        minHeight: '100vh',
        background: colors.background.main,
        fontFamily: typography.fontFamily.primary,
        direction: 'rtl' as const,
      },
      content: {
        padding: `0 ${spacing.lg}px ${spacing['4xl'] * 2.5}px`,
      },
    },
  },

  // ==========================================
  // EXERCISE LIST
  // ==========================================
  exerciseList: {
    item: {
      base: {
        background: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.sm,
      },
      image: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.md,
        background: colors.background.elevated,
        objectFit: 'cover' as const,
      },
      title: {
        color: colors.text.primary,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
      },
      subtitle: {
        color: colors.text.secondary,
        fontSize: typography.fontSize.sm,
      },
      checkbox: {
        width: 24,
        height: 24,
        borderRadius: borderRadius.full,
        border: `2px solid ${colors.border.light}`,
      },
      checkboxChecked: {
        background: colors.primary.main,
        borderColor: colors.primary.main,
      },
    },
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * מחזיר סגנון כרטיס סטטיסטיקה לפי variant
 */
export const getStatCardStyle = (variant: 'streak' | 'weekly' | 'total') => ({
  ...components.cards.statCard.base,
  ...components.cards.statCard.variants[variant],
});

/**
 * מחזיר סגנון כפתור פילטר
 */
export const getFilterButtonStyle = (isActive: boolean) => ({
  ...components.buttons.filter.base,
  ...(isActive ? components.buttons.filter.active : components.buttons.filter.inactive),
});

/**
 * מחזיר סגנון פריט ניווט תחתון
 */
export const getNavItemStyle = (isActive: boolean) => ({
  icon: {
    ...components.layout.bottomNav.icon,
    ...(isActive ? components.layout.bottomNav.iconActive : {}),
  },
  label: {
    ...components.layout.bottomNav.label,
    ...(isActive ? components.layout.bottomNav.labelActive : components.layout.bottomNav.labelInactive),
  },
});

// ============================================
// DEFAULT EXPORT
// ============================================

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  transitions,
  components,
} as const;

export default theme;
