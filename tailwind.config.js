/** @type {import('tailwindcss').Config} */
const tokens = require('./src/theme/tailwind-tokens.js');

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // ============================================
        // DESIGN TOKENS - from src/theme/tokens.ts
        // ============================================
        background: tokens.colors.background,
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        accent: tokens.colors.accent,
        text: tokens.colors.text,
        border: tokens.colors.border,
        status: tokens.colors.status,
        workout: tokens.colors.workout,
        'workout-status': tokens.colors['workout-status'],
        muscles: tokens.colors.muscles,

        // ============================================
        // LEGACY COLORS (for backwards compatibility)
        // ============================================
        neon: {
          dark: tokens.colors.background.main,
          blue: '#00BFFF',
          cyan: tokens.colors.primary.main,
          green: '#00FF7F',
          purple: tokens.colors.accent.purple,
          magenta: '#FF00FF',
        },

        'neon-gray': {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: tokens.colors.border.light,
          750: tokens.colors.secondary.light,
          800: tokens.colors.secondary.main,
          900: tokens.colors.secondary.dark,
        },

        dark: {
          bg: tokens.colors.background.main,
          surface: tokens.colors.background.card,
          card: tokens.colors.background.elevated,
          border: tokens.colors.border.light,
        },

        role: {
          admin: tokens.colors.accent.gold,
          'admin-bg': 'rgba(196, 160, 82, 0.1)',
          trainer: tokens.colors.status.info,
          'trainer-bg': 'rgba(59, 130, 246, 0.1)',
          user: tokens.colors.status.success,
          'user-bg': 'rgba(16, 185, 129, 0.1)',
        },
      },

      // ============================================
      // FONT FAMILIES
      // ============================================
      fontFamily: {
        sans: ['Heebo', 'Inter', 'sans-serif'],
        display: ['Heebo', 'Assistant', 'sans-serif'],
      },

      // ============================================
      // BOX SHADOWS
      // ============================================
      boxShadow: {
        'sm': tokens.shadows.sm,
        'md': tokens.shadows.md,
        'lg': tokens.shadows.lg,
        'xl': tokens.shadows.xl,
        'card': tokens.shadows.card,
        'card-hover': tokens.shadows.cardHover,
        'button': tokens.shadows.button,
        'button-hover': tokens.shadows.buttonHover,
        'button-pressed': tokens.shadows.buttonPressed,
        'glow-orange': tokens.shadows.glowOrange,
        'glow-cyan': tokens.shadows.glowCyan,
        'glow-gold': tokens.shadows.glowGold,
        'neon': '0 0 20px rgba(0, 212, 170, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)',
        'neon-hover': '0 0 30px rgba(0, 212, 170, 0.5), 0 8px 30px rgba(0, 0, 0, 0.3)',
        'neon-active': '0 0 15px rgba(0, 212, 170, 0.3), 0 2px 10px rgba(0, 0, 0, 0.3)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      },

      // ============================================
      // BORDER RADIUS
      // ============================================
      borderRadius: {
        'xs': tokens.borderRadius.xs,
        'sm': tokens.borderRadius.sm,
        'md': tokens.borderRadius.md,
        'lg': tokens.borderRadius.lg,
        'xl': tokens.borderRadius.xl,
        '2xl': tokens.borderRadius['2xl'],
        '4xl': '2rem',
        'full': tokens.borderRadius.full,
      },

      // ============================================
      // GRADIENTS
      // ============================================
      backgroundImage: {
        'gradient-primary': `linear-gradient(135deg, ${tokens.colors.primary.dark} 0%, ${tokens.colors.primary.main} 50%, ${tokens.colors.primary.light} 100%)`,
        'gradient-secondary': `linear-gradient(180deg, ${tokens.colors.secondary.light} 0%, ${tokens.colors.secondary.main} 100%)`,
        'gradient-neon': `linear-gradient(135deg, ${tokens.colors.primary.dark} 0%, ${tokens.colors.primary.light} 100%)`,
        'gradient-dark': `linear-gradient(135deg, ${tokens.colors.background.main} 0%, ${tokens.colors.background.card} 100%)`,
        'gradient-card': `linear-gradient(135deg, ${tokens.colors.background.card} 0%, ${tokens.colors.background.elevated} 100%)`,
      },

      // ============================================
      // SPACING (Custom values)
      // ============================================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // ============================================
      // Z-INDEX LAYERS
      // ============================================
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // ============================================
      // ANIMATIONS
      // ============================================
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'expand': 'expand 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          from: { filter: `drop-shadow(0 0 20px rgba(0, 212, 170, 0.8))` },
          to: { filter: `drop-shadow(0 0 30px rgba(0, 212, 170, 1))` },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        expand: {
          from: { opacity: '0', maxHeight: '0' },
          to: { opacity: '1', maxHeight: '500px' },
        },
      },

      // ============================================
      // TRANSITION TIMING
      // ============================================
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
    },
  },
  plugins: [],
}
