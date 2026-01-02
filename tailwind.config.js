/** @type {import('tailwindcss').Config} */
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
        // PRIMARY BRAND COLORS
        // ============================================
        primary: {
          50: '#E6F7FF',
          100: '#BAE7FF',
          200: '#7DD3FC',
          300: '#38BDF8',
          400: '#0EA5E9',
          500: '#0284C7',
          600: '#0369A1',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#1E293B',
        },

        // ============================================
        // ACCENT COLORS (Green/Cyan)
        // ============================================
        accent: {
          50: '#ECFDF5',
          100: '#A7F3D0',
          200: '#6EE7B7',
          300: '#34D399',
          400: '#10B981',
          500: '#059669',
          600: '#047857',
          700: '#065F46',
          800: '#064E3B',
          900: '#022C22',
        },

        // ============================================
        // NEON EFFECTS (Brand Identity)
        // ============================================
        neon: {
          dark: '#0a0a0a',       // Main background
          blue: '#00BFFF',
          cyan: '#00FFFF',
          green: '#00FF7F',
          purple: '#8A2BE2',
          magenta: '#FF00FF',
        },

        // ============================================
        // GRAY SCALE (Neon Theme)
        // ============================================
        'neon-gray': {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          750: '#2D3748',
          800: '#1F2937',
          900: '#111827',
        },

        // ============================================
        // DARK THEME SURFACES
        // ============================================
        dark: {
          bg: '#0F172A',
          surface: '#1E293B',
          card: '#334155',
          border: '#475569',
        },

        // ============================================
        // TEXT COLORS
        // ============================================
        text: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#64748B',
          accent: '#00BFFF',
        },

        // ============================================
        // STATUS COLORS (Semantic)
        // ============================================
        status: {
          // Success
          success: '#22C55E',         // green-500
          'success-light': '#22C55E1A', // 10% opacity
          'success-text': '#4ADE80',   // green-400

          // Error
          error: '#EF4444',           // red-500
          'error-light': '#EF44441A',  // 10% opacity
          'error-text': '#F87171',     // red-400

          // Warning
          warning: '#F59E0B',         // amber-500
          'warning-light': '#F59E0B1A', // 10% opacity
          'warning-text': '#FBBF24',   // amber-400

          // Info
          info: '#3B82F6',            // blue-500
          'info-light': '#3B82F61A',   // 10% opacity
          'info-text': '#60A5FA',      // blue-400
        },

        // ============================================
        // WORKOUT SPECIFIC COLORS
        // ============================================
        workout: {
          // Completed state
          'completed-bg': '#14B8A61A',    // teal with 10% opacity
          'completed-border': '#14B8A6',  // teal-500
          'completed-text': '#5EEAD4',    // teal-300

          // Active state
          'active-border': '#00FFFF',     // neon-cyan
          'active-bg': '#00FFFF1A',       // 10% opacity

          // Timer
          'timer-active': '#FF6B6B',      // coral
          'timer-overtime': '#EF4444',    // red-500
        },

        // ============================================
        // ROLE COLORS (Admin/User)
        // ============================================
        role: {
          admin: '#FBBF24',        // yellow/gold
          'admin-bg': '#FBBF241A',
          trainer: '#3B82F6',      // blue
          'trainer-bg': '#3B82F61A',
          user: '#22C55E',         // green
          'user-bg': '#22C55E1A',
        },
      },

      // ============================================
      // FONT FAMILIES
      // ============================================
      fontFamily: {
        sans: ['Inter', 'Rubik', 'sans-serif'],
        display: ['Poppins', 'Assistant', 'sans-serif'],
      },

      // ============================================
      // BOX SHADOWS
      // ============================================
      boxShadow: {
        'neon': '0 0 20px rgba(0, 191, 255, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)',
        'neon-hover': '0 0 30px rgba(0, 191, 255, 0.5), 0 8px 30px rgba(0, 0, 0, 0.3)',
        'neon-active': '0 0 15px rgba(0, 191, 255, 0.3), 0 2px 10px rgba(0, 0, 0, 0.3)',
        'card': '0 0 40px rgba(0, 191, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      },

      // ============================================
      // GRADIENTS
      // ============================================
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #1E40AF 0%, #059669 100%)',
        'gradient-neon': 'linear-gradient(135deg, #00BFFF 0%, #00FF7F 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)',
      },

      // ============================================
      // SPACING (Custom values)
      // ============================================
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
      },

      // ============================================
      // BORDER RADIUS
      // ============================================
      borderRadius: {
        '4xl': '2rem',    // 32px
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
          from: { filter: 'drop-shadow(0 0 20px rgba(0, 191, 255, 0.8))' },
          to: { filter: 'drop-shadow(0 0 30px rgba(0, 191, 255, 1))' },
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
