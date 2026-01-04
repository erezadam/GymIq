/**
 * GymIQ Design Tokens for Tailwind CSS
 *
 * This file exports the design tokens in a format that Tailwind can consume.
 * The source of truth is tokens.ts - this file mirrors those values.
 */

module.exports = {
  colors: {
    // Background
    background: {
      main: '#0B0D12',
      card: '#141820',
      elevated: '#1A1F2A',
      input: '#0D0F14',
    },

    // Primary - Cyan/Teal
    primary: {
      main: '#00D4AA',
      light: '#00E5B8',
      dark: '#00B894',
      DEFAULT: '#00D4AA',
    },

    // Secondary - Gray/Black buttons
    secondary: {
      main: '#1E2330',
      light: '#252B3A',
      dark: '#14181F',
      DEFAULT: '#1E2330',
    },

    // Accent Colors
    accent: {
      orange: '#FF6B35',
      gold: '#C4A052',
      cyan: '#00D4AA',
      purple: '#8B5CF6',
      pink: '#EC4899',
      DEFAULT: '#FF6B35',
    },

    // Text
    text: {
      primary: '#FFFFFF',
      secondary: '#8B95A5',
      muted: '#5A6478',
      disabled: '#3D4555',
    },

    // Borders
    border: {
      DEFAULT: '#1E2430',
      light: '#2A3142',
      focus: '#00D4AA',
      glowOrange: '#FF6B35',
    },

    // Status
    status: {
      success: '#10B981',
      warning: '#FFB020',
      error: '#EF4444',
      info: '#3B82F6',
      active: '#00D4AA',
    },

    // Workout Status (legacy)
    workout: {
      completed: '#10B981',
      inProgress: '#FFB020',
      planned: '#3B82F6',
      rest: '#5A6478',
    },

    // Workout Status Colors (for WorkoutHistory)
    'workout-status': {
      // Completed - Blue
      'completed': '#3B82F6',
      'completed-bg': 'rgba(59, 130, 246, 0.15)',
      'completed-text': '#3B82F6',
      // In Progress - Yellow/Orange
      'in-progress': '#FFB020',
      'in-progress-bg': 'rgba(255, 176, 32, 0.15)',
      'in-progress-text': '#FFB020',
      // Planned - Red
      'planned': '#EF4444',
      'planned-bg': 'rgba(239, 68, 68, 0.15)',
      'planned-text': '#EF4444',
    },

    // Muscle Groups
    muscles: {
      chest: '#FF6B35',
      back: '#8B5CF6',
      legs: '#00D4AA',
      shoulders: '#FFB020',
      arms: '#3B82F6',
      core: '#EC4899',
    },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
  },

  borderRadius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },

  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.6)',
    card: '0 6px 24px rgba(0, 0, 0, 0.5)',
    cardHover: '0 10px 32px rgba(0, 0, 0, 0.6)',
    button: '0 4px 0 #0A0C10, 0 8px 16px rgba(0, 0, 0, 0.5)',
    buttonHover: '0 5px 0 #0A0C10, 0 10px 20px rgba(0, 0, 0, 0.55)',
    buttonPressed: '0 1px 0 #0A0C10, 0 2px 4px rgba(0, 0, 0, 0.4)',
    glowOrange: '0 0 12px rgba(255, 107, 53, 0.5), 0 0 24px rgba(255, 107, 53, 0.3)',
    glowCyan: '0 0 12px rgba(0, 212, 170, 0.5), 0 0 24px rgba(0, 212, 170, 0.3)',
    glowGold: '0 0 12px rgba(196, 160, 82, 0.4)',
  },

  typography: {
    fontFamily: {
      primary: "'Heebo', 'Inter', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '15px',
      lg: '17px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px',
      '4xl': '40px',
    },
  },

  transitions: {
    fast: '0.1s ease',
    normal: '0.15s ease',
    slow: '0.3s ease',
  },
};
