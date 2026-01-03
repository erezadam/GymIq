/**
 * 🎨 GymIQ Design Tokens
 * 
 * ⚠️ זהו הקובץ היחיד לעדכון עיצוב!
 * כל הקומפוננטות חייבות לקרוא מכאן.
 * אסור לכתוב ערכי עיצוב ישירות בקומפוננטות.
 */

export const tokens = {
  // ============================================
  // 🎨 COLORS
  // ============================================
  colors: {
    // Background
    background: {
      main: '#0B0D12',       // רקע ראשי
      card: '#141820',       // כרטיסים
      elevated: '#1A1F2A',   // רקע מוגבה (modals, dropdowns)
      input: '#0D0F14',      // שדות קלט
    },
    
    // Primary - Cyan/Teal
    primary: {
      main: '#00D4AA',
      light: '#00E5B8',
      dark: '#00B894',
      gradient: 'linear-gradient(135deg, #00B894 0%, #00D4AA 50%, #00E5B8 100%)',
    },
    
    // Secondary - כפתורים אפורים/שחורים
    secondary: {
      main: '#1E2330',
      light: '#252B3A',
      dark: '#14181F',
      gradient: 'linear-gradient(180deg, #252B3A 0%, #1E2330 100%)',
    },
    
    // Accent Colors
    accent: {
      orange: '#FF6B35',     // מסגרת זוהרת לפעולות ראשיות
      gold: '#C4A052',       // אייקון לוח שנה
      cyan: '#00D4AA',       // אייקון אימונים
      purple: '#8B5CF6',
      pink: '#EC4899',
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
      default: '#1E2430',
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
    
    // Workout Status
    workout: {
      completed: '#10B981',   // ירוק - הושלם
      inProgress: '#FFB020',  // צהוב - בתהליך
      planned: '#3B82F6',     // כחול - מתוכנן
      rest: '#5A6478',        // אפור - מנוחה
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
  
  // ============================================
  // 📏 SPACING
  // ============================================
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
  
  // ============================================
  // 🔲 BORDER RADIUS
  // ============================================
  borderRadius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },
  
  // ============================================
  // 🌑 SHADOWS
  // ============================================
  shadows: {
    // Basic shadows
    sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.6)',
    
    // 3D Button shadows
    button: {
      default: '0 4px 0 #0A0C10, 0 8px 16px rgba(0, 0, 0, 0.5)',
      hover: '0 5px 0 #0A0C10, 0 10px 20px rgba(0, 0, 0, 0.55)',
      pressed: '0 1px 0 #0A0C10, 0 2px 4px rgba(0, 0, 0, 0.4)',
      depth: {
        sm: 3,
        md: 4,
        lg: 5,
      },
    },
    
    // Card shadows
    card: '0 6px 24px rgba(0, 0, 0, 0.5)',
    cardHover: '0 10px 32px rgba(0, 0, 0, 0.6)',
    
    // Glow effects
    glow: {
      orange: '0 0 12px rgba(255, 107, 53, 0.5), 0 0 24px rgba(255, 107, 53, 0.3)',
      cyan: '0 0 12px rgba(0, 212, 170, 0.5), 0 0 24px rgba(0, 212, 170, 0.3)',
      gold: '0 0 12px rgba(196, 160, 82, 0.4)',
    },
  },
  
  // ============================================
  // ✍️ TYPOGRAPHY
  // ============================================
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
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.7,
    },
  },
  
  // ============================================
  // ⏱️ TRANSITIONS
  // ============================================
  transitions: {
    fast: '0.1s ease',
    normal: '0.15s ease',
    slow: '0.3s ease',
  },
  
  // ============================================
  // 📐 COMPONENT SIZES
  // ============================================
  components: {
    button: {
      height: {
        sm: '36px',
        md: '42px',
        lg: '48px',
      },
      padding: {
        sm: '8px 14px',
        md: '10px 18px',
        lg: '12px 22px',
      },
    },
    
    card: {
      padding: {
        sm: '12px',
        md: '16px',
        lg: '20px',
      },
    },
    
    icon: {
      size: {
        sm: '36px',
        md: '44px',
        lg: '56px',
      },
    },
    
    stat: {
      iconSize: '40px',
      valueSize: '28px',
      labelSize: '12px',
    },
  },
};

// ============================================
// 🔧 HELPER FUNCTIONS
// ============================================

/**
 * יוצר צבע עם שקיפות
 */
export const withOpacity = (color: string, opacity: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * יוצר צל לכפתור תלת מימדי
 */
export const getButtonShadow = (depth: number, isPressed: boolean, hasGlow: boolean = false): string => {
  const baseShadow = isPressed
    ? `0 1px 0 #0A0C10, 0 2px 4px rgba(0, 0, 0, 0.4)`
    : `0 ${depth}px 0 #0A0C10, 0 ${depth * 2}px ${depth * 3}px rgba(0, 0, 0, 0.5)`;
  
  if (hasGlow) {
    return `${baseShadow}, ${tokens.shadows.glow.orange}`;
  }
  return baseShadow;
};

// Type exports
export type Tokens = typeof tokens;
export type Colors = typeof tokens.colors;
export type Spacing = typeof tokens.spacing;
