export interface ThemeColorItem {
  name: string;
  label: string;
  swatch: string; // CSS color string for the swatch preview circle
  light: {
    primary: string;
    primaryForeground: string;
    ring: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
    sidebarRing: string;
  };
  dark: {
    primary: string;
    primaryForeground: string;
    ring: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
    sidebarRing: string;
  };
}

export interface BaseColorItem {
  name: string;
  label: string;
  swatch: string;
  light: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    input: string;
    sidebar: string;
    sidebarForeground: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
  };
  dark: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    input: string;
    sidebar: string;
    sidebarForeground: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
  };
}

export interface StyleItem {
  name: string;
  label: string;
  description: string;
  locksRadius?: boolean;
  forcedRadius?: string;
  spacing?: string;
  tracking?: string;
  fontSans?: string;
  defaultRadius?: string;
}

export interface RadiusItem {
  name: 'none' | 'small' | 'medium' | 'large' | 'default';
  label: string;
  title: string;
  value: string;
  previewRadius: string;
  isDashed?: boolean;
}

export const THEMES_LIST: ThemeColorItem[] = [
  {
    name: 'neutral',
    label: 'Neutral',
    swatch: '#3f3f46',
    light: {
      primary: 'oklch(0.205 0 0)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.708 0 0)',
      sidebarPrimary: 'oklch(0.205 0 0)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.708 0 0)'
    },
    dark: {
      primary: 'oklch(0.985 0 0)',
      primaryForeground: 'oklch(0.205 0 0)',
      ring: 'oklch(0.439 0 0)',
      sidebarPrimary: 'oklch(0.985 0 0)',
      sidebarPrimaryForeground: 'oklch(0.205 0 0)',
      sidebarRing: 'oklch(0.439 0 0)'
    }
  },
  {
    name: 'red',
    label: 'Red',
    swatch: '#dc2626',
    light: {
      primary: 'oklch(0.577 0.245 27.325)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.704 0.191 22.216)',
      sidebarPrimary: 'oklch(0.577 0.245 27.325)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.704 0.191 22.216)'
    },
    dark: {
      primary: 'oklch(0.637 0.237 25.331)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.704 0.191 22.216)',
      sidebarPrimary: 'oklch(0.637 0.237 25.331)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.704 0.191 22.216)'
    }
  },
  {
    name: 'orange',
    label: 'Orange',
    swatch: '#ea580c',
    light: {
      primary: 'oklch(0.646 0.222 41.116)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.75 0.183 55.934)',
      sidebarPrimary: 'oklch(0.646 0.222 41.116)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.75 0.183 55.934)'
    },
    dark: {
      primary: 'oklch(0.705 0.213 47.604)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.75 0.183 55.934)',
      sidebarPrimary: 'oklch(0.705 0.213 47.604)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.75 0.183 55.934)'
    }
  },
  {
    name: 'amber',
    label: 'Amber',
    swatch: '#d97706',
    light: {
      primary: 'oklch(0.666 0.179 58.318)',
      primaryForeground: 'oklch(0.987 0.022 95.277)',
      ring: 'oklch(0.769 0.188 70.08)',
      sidebarPrimary: 'oklch(0.666 0.179 58.318)',
      sidebarPrimaryForeground: 'oklch(0.987 0.022 95.277)',
      sidebarRing: 'oklch(0.769 0.188 70.08)'
    },
    dark: {
      primary: 'oklch(0.666 0.179 58.318)',
      primaryForeground: 'oklch(0.987 0.022 95.277)',
      ring: 'oklch(0.769 0.188 70.08)',
      sidebarPrimary: 'oklch(0.666 0.179 58.318)',
      sidebarPrimaryForeground: 'oklch(0.987 0.022 95.277)',
      sidebarRing: 'oklch(0.769 0.188 70.08)'
    }
  },
  {
    name: 'yellow',
    label: 'Yellow',
    swatch: '#ca8a04',
    light: {
      primary: 'oklch(0.681 0.162 75.834)',
      primaryForeground: 'oklch(0.205 0 0)',
      ring: 'oklch(0.795 0.184 86.047)',
      sidebarPrimary: 'oklch(0.681 0.162 75.834)',
      sidebarPrimaryForeground: 'oklch(0.205 0 0)',
      sidebarRing: 'oklch(0.795 0.184 86.047)'
    },
    dark: {
      primary: 'oklch(0.768 0.188 70.08)',
      primaryForeground: 'oklch(0.205 0 0)',
      ring: 'oklch(0.795 0.184 86.047)',
      sidebarPrimary: 'oklch(0.768 0.188 70.08)',
      sidebarPrimaryForeground: 'oklch(0.205 0 0)',
      sidebarRing: 'oklch(0.795 0.184 86.047)'
    }
  },
  {
    name: 'lime',
    label: 'Lime',
    swatch: '#65a30d',
    light: {
      primary: 'oklch(0.648 0.2 131.684)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.768 0.233 130.85)',
      sidebarPrimary: 'oklch(0.648 0.2 131.684)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.768 0.233 130.85)'
    },
    dark: {
      primary: 'oklch(0.768 0.233 130.85)',
      primaryForeground: 'oklch(0.205 0 0)',
      ring: 'oklch(0.768 0.233 130.85)',
      sidebarPrimary: 'oklch(0.768 0.233 130.85)',
      sidebarPrimaryForeground: 'oklch(0.205 0 0)',
      sidebarRing: 'oklch(0.768 0.233 130.85)'
    }
  },
  {
    name: 'green',
    label: 'Green',
    swatch: '#16a34a',
    light: {
      primary: 'oklch(0.627 0.194 149.214)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.723 0.219 149.579)',
      sidebarPrimary: 'oklch(0.627 0.194 149.214)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.723 0.219 149.579)'
    },
    dark: {
      primary: 'oklch(0.696 0.17 162.48)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.723 0.219 149.579)',
      sidebarPrimary: 'oklch(0.696 0.17 162.48)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.723 0.219 149.579)'
    }
  },
  {
    name: 'emerald',
    label: 'Emerald',
    swatch: '#059669',
    light: {
      primary: 'oklch(0.596 0.145 163.225)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.696 0.17 162.48)',
      sidebarPrimary: 'oklch(0.596 0.145 163.225)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.696 0.17 162.48)'
    },
    dark: {
      primary: 'oklch(0.696 0.17 162.48)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.696 0.17 162.48)',
      sidebarPrimary: 'oklch(0.696 0.17 162.48)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.696 0.17 162.48)'
    }
  },
  {
    name: 'teal',
    label: 'Teal',
    swatch: '#0d9488',
    light: {
      primary: 'oklch(0.6 0.118 184.704)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.704 0.14 182.503)',
      sidebarPrimary: 'oklch(0.6 0.118 184.704)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.704 0.14 182.503)'
    },
    dark: {
      primary: 'oklch(0.704 0.14 182.503)',
      primaryForeground: 'oklch(0.141 0.005 285.823)',
      ring: 'oklch(0.704 0.14 182.503)',
      sidebarPrimary: 'oklch(0.704 0.14 182.503)',
      sidebarPrimaryForeground: 'oklch(0.141 0.005 285.823)',
      sidebarRing: 'oklch(0.704 0.14 182.503)'
    }
  },
  {
    name: 'cyan',
    label: 'Cyan',
    swatch: '#0891b2',
    light: {
      primary: 'oklch(0.609 0.126 221.723)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.715 0.143 215.221)',
      sidebarPrimary: 'oklch(0.609 0.126 221.723)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.715 0.143 215.221)'
    },
    dark: {
      primary: 'oklch(0.715 0.143 215.221)',
      primaryForeground: 'oklch(0.141 0.005 285.823)',
      ring: 'oklch(0.715 0.143 215.221)',
      sidebarPrimary: 'oklch(0.715 0.143 215.221)',
      sidebarPrimaryForeground: 'oklch(0.141 0.005 285.823)',
      sidebarRing: 'oklch(0.715 0.143 215.221)'
    }
  },
  {
    name: 'sky',
    label: 'Sky',
    swatch: '#0284c7',
    light: {
      primary: 'oklch(0.588 0.158 241.966)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.685 0.169 237.323)',
      sidebarPrimary: 'oklch(0.588 0.158 241.966)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.685 0.169 237.323)'
    },
    dark: {
      primary: 'oklch(0.685 0.169 237.323)',
      primaryForeground: 'oklch(0.141 0.005 285.823)',
      ring: 'oklch(0.685 0.169 237.323)',
      sidebarPrimary: 'oklch(0.685 0.169 237.323)',
      sidebarPrimaryForeground: 'oklch(0.141 0.005 285.823)',
      sidebarRing: 'oklch(0.685 0.169 237.323)'
    }
  },
  {
    name: 'blue',
    label: 'Blue',
    swatch: '#2563eb',
    light: {
      primary: 'oklch(0.546 0.245 262.881)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.623 0.214 259.815)',
      sidebarPrimary: 'oklch(0.546 0.245 262.881)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.623 0.214 259.815)'
    },
    dark: {
      primary: 'oklch(0.623 0.214 259.815)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.623 0.214 259.815)',
      sidebarPrimary: 'oklch(0.623 0.214 259.815)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.623 0.214 259.815)'
    }
  },
  {
    name: 'indigo',
    label: 'Indigo',
    swatch: '#4f46e5',
    light: {
      primary: 'oklch(0.511 0.262 276.966)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.59 0.25 277.023)',
      sidebarPrimary: 'oklch(0.511 0.262 276.966)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.59 0.25 277.023)'
    },
    dark: {
      primary: 'oklch(0.59 0.25 277.023)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.59 0.25 277.023)',
      sidebarPrimary: 'oklch(0.59 0.25 277.023)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.59 0.25 277.023)'
    }
  },
  {
    name: 'violet',
    label: 'Violet',
    swatch: '#7c3aed',
    light: {
      primary: 'oklch(0.541 0.281 293.009)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.606 0.25 292.717)',
      sidebarPrimary: 'oklch(0.541 0.281 293.009)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.606 0.25 292.717)'
    },
    dark: {
      primary: 'oklch(0.606 0.25 292.717)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.606 0.25 292.717)',
      sidebarPrimary: 'oklch(0.606 0.25 292.717)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.606 0.25 292.717)'
    }
  },
  {
    name: 'purple',
    label: 'Purple',
    swatch: '#9333ea',
    light: {
      primary: 'oklch(0.558 0.288 302.321)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.627 0.265 303.9)',
      sidebarPrimary: 'oklch(0.558 0.288 302.321)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.627 0.265 303.9)'
    },
    dark: {
      primary: 'oklch(0.627 0.265 303.9)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.627 0.265 303.9)',
      sidebarPrimary: 'oklch(0.627 0.265 303.9)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.627 0.265 303.9)'
    }
  },
  {
    name: 'fuchsia',
    label: 'Fuchsia',
    swatch: '#c026d3',
    light: {
      primary: 'oklch(0.591 0.293 322.896)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.656 0.26 322.66)',
      sidebarPrimary: 'oklch(0.591 0.293 322.896)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.656 0.26 322.66)'
    },
    dark: {
      primary: 'oklch(0.656 0.26 322.66)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.656 0.26 322.66)',
      sidebarPrimary: 'oklch(0.656 0.26 322.66)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.656 0.26 322.66)'
    }
  },
  {
    name: 'pink',
    label: 'Pink',
    swatch: '#db2777',
    light: {
      primary: 'oklch(0.592 0.249 0.584)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.656 0.24 354.308)',
      sidebarPrimary: 'oklch(0.592 0.249 0.584)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.656 0.24 354.308)'
    },
    dark: {
      primary: 'oklch(0.656 0.24 354.308)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.656 0.24 354.308)',
      sidebarPrimary: 'oklch(0.656 0.24 354.308)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.656 0.24 354.308)'
    }
  },
  {
    name: 'rose',
    label: 'Rose',
    swatch: '#e11d48',
    light: {
      primary: 'oklch(0.586 0.253 17.585)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.645 0.246 16.439)',
      sidebarPrimary: 'oklch(0.586 0.253 17.585)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.645 0.246 16.439)'
    },
    dark: {
      primary: 'oklch(0.645 0.246 16.439)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.645 0.246 16.439)',
      sidebarPrimary: 'oklch(0.645 0.246 16.439)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarRing: 'oklch(0.645 0.246 16.439)'
    }
  }
];

export const BASES_LIST: BaseColorItem[] = [
  {
    name: 'zinc',
    label: 'Zinc',
    swatch: '#71717a',
    light: {
      background: 'oklch(0.985 0 0)',
      foreground: 'oklch(0.274 0.006 286.033)',
      card: 'oklch(0.985 0 0)',
      cardForeground: 'oklch(0.274 0.006 286.033)',
      popover: 'oklch(0.985 0 0)',
      popoverForeground: 'oklch(0.274 0.006 286.033)',
      secondary: 'oklch(0.967 0.001 286.375)',
      secondaryForeground: 'oklch(0.274 0.006 286.033)',
      muted: 'oklch(0.967 0.001 286.375)',
      mutedForeground: 'oklch(0.552 0.016 285.938)',
      accent: 'oklch(0.967 0.001 286.375)',
      accentForeground: 'oklch(0.274 0.006 286.033)',
      border: 'oklch(0.92 0.004 286.32)',
      input: 'oklch(0.92 0.004 286.32)',
      sidebar: 'oklch(0.97 0.002 286)',
      sidebarForeground: 'oklch(0.274 0.006 286.033)',
      sidebarAccent: 'oklch(0.95 0.002 286)',
      sidebarAccentForeground: 'oklch(0.274 0.006 286.033)',
      sidebarBorder: 'oklch(0.92 0.004 286.32)'
    },
    dark: {
      background: 'oklch(0.141 0.005 285.823)',
      foreground: 'oklch(0.967 0.001 286.375)',
      card: 'oklch(0.16 0.006 285.823)',
      cardForeground: 'oklch(0.967 0.001 286.375)',
      popover: 'oklch(0.16 0.006 285.823)',
      popoverForeground: 'oklch(0.967 0.001 286.375)',
      secondary: 'oklch(0.21 0.006 285.885)',
      secondaryForeground: 'oklch(0.967 0.001 286.375)',
      muted: 'oklch(0.21 0.006 285.885)',
      mutedForeground: 'oklch(0.705 0.015 286.067)',
      accent: 'oklch(0.21 0.006 285.885)',
      accentForeground: 'oklch(0.967 0.001 286.375)',
      border: 'oklch(0.274 0.006 286.033)',
      input: 'oklch(0.274 0.006 286.033)',
      sidebar: 'oklch(0.18 0.006 285.885)',
      sidebarForeground: 'oklch(0.967 0.001 286.375)',
      sidebarAccent: 'oklch(0.23 0.006 285.885)',
      sidebarAccentForeground: 'oklch(0.967 0.001 286.375)',
      sidebarBorder: 'oklch(0.274 0.006 286.033)'
    }
  },
  {
    name: 'neutral',
    label: 'Neutral',
    swatch: '#737373',
    light: {
      background: 'oklch(0.985 0 0)',
      foreground: 'oklch(0.205 0 0)',
      card: 'oklch(0.985 0 0)',
      cardForeground: 'oklch(0.205 0 0)',
      popover: 'oklch(0.985 0 0)',
      popoverForeground: 'oklch(0.205 0 0)',
      secondary: 'oklch(0.96 0 0)',
      secondaryForeground: 'oklch(0.205 0 0)',
      muted: 'oklch(0.96 0 0)',
      mutedForeground: 'oklch(0.55 0 0)',
      accent: 'oklch(0.96 0 0)',
      accentForeground: 'oklch(0.205 0 0)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      sidebar: 'oklch(0.97 0 0)',
      sidebarForeground: 'oklch(0.205 0 0)',
      sidebarAccent: 'oklch(0.94 0 0)',
      sidebarAccentForeground: 'oklch(0.205 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)'
    },
    dark: {
      background: 'oklch(0.145 0 0)',
      foreground: 'oklch(0.985 0 0)',
      card: 'oklch(0.17 0 0)',
      cardForeground: 'oklch(0.985 0 0)',
      popover: 'oklch(0.17 0 0)',
      popoverForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.22 0 0)',
      secondaryForeground: 'oklch(0.985 0 0)',
      muted: 'oklch(0.22 0 0)',
      mutedForeground: 'oklch(0.7 0 0)',
      accent: 'oklch(0.22 0 0)',
      accentForeground: 'oklch(0.985 0 0)',
      border: 'oklch(0.28 0 0)',
      input: 'oklch(0.28 0 0)',
      sidebar: 'oklch(0.18 0 0)',
      sidebarForeground: 'oklch(0.985 0 0)',
      sidebarAccent: 'oklch(0.24 0 0)',
      sidebarAccentForeground: 'oklch(0.985 0 0)',
      sidebarBorder: 'oklch(0.28 0 0)'
    }
  },
  {
    name: 'stone',
    label: 'Stone',
    swatch: '#78716c',
    light: {
      background: 'oklch(0.985 0.002 58.071)',
      foreground: 'oklch(0.216 0.006 56.043)',
      card: 'oklch(0.985 0.002 58.071)',
      cardForeground: 'oklch(0.216 0.006 56.043)',
      popover: 'oklch(0.985 0.002 58.071)',
      popoverForeground: 'oklch(0.216 0.006 56.043)',
      secondary: 'oklch(0.965 0.003 58)',
      secondaryForeground: 'oklch(0.216 0.006 56.043)',
      muted: 'oklch(0.965 0.003 58)',
      mutedForeground: 'oklch(0.553 0.013 58.071)',
      accent: 'oklch(0.965 0.003 58)',
      accentForeground: 'oklch(0.216 0.006 56.043)',
      border: 'oklch(0.92 0.005 58)',
      input: 'oklch(0.92 0.005 58)',
      sidebar: 'oklch(0.97 0.003 58)',
      sidebarForeground: 'oklch(0.216 0.006 56.043)',
      sidebarAccent: 'oklch(0.95 0.004 58)',
      sidebarAccentForeground: 'oklch(0.216 0.006 56.043)',
      sidebarBorder: 'oklch(0.92 0.005 58)'
    },
    dark: {
      background: 'oklch(0.147 0.004 49.25)',
      foreground: 'oklch(0.985 0.002 58.071)',
      card: 'oklch(0.17 0.005 49.25)',
      cardForeground: 'oklch(0.985 0.002 58.071)',
      popover: 'oklch(0.17 0.005 49.25)',
      popoverForeground: 'oklch(0.985 0.002 58.071)',
      secondary: 'oklch(0.22 0.005 49.25)',
      secondaryForeground: 'oklch(0.985 0.002 58.071)',
      muted: 'oklch(0.22 0.005 49.25)',
      mutedForeground: 'oklch(0.7 0.01 58.071)',
      accent: 'oklch(0.22 0.005 49.25)',
      accentForeground: 'oklch(0.985 0.002 58.071)',
      border: 'oklch(0.28 0.006 49.25)',
      input: 'oklch(0.28 0.006 49.25)',
      sidebar: 'oklch(0.18 0.005 49.25)',
      sidebarForeground: 'oklch(0.985 0.002 58.071)',
      sidebarAccent: 'oklch(0.24 0.005 49.25)',
      sidebarAccentForeground: 'oklch(0.985 0.002 58.071)',
      sidebarBorder: 'oklch(0.28 0.006 49.25)'
    }
  },
  {
    name: 'mauve',
    label: 'Mauve',
    swatch: '#7e6f79',
    light: {
      background: 'oklch(0.988 0.005 310)',
      foreground: 'oklch(0.22 0.015 310)',
      card: 'oklch(0.988 0.005 310)',
      cardForeground: 'oklch(0.22 0.015 310)',
      popover: 'oklch(0.988 0.005 310)',
      popoverForeground: 'oklch(0.22 0.015 310)',
      secondary: 'oklch(0.965 0.008 310)',
      secondaryForeground: 'oklch(0.22 0.015 310)',
      muted: 'oklch(0.965 0.008 310)',
      mutedForeground: 'oklch(0.55 0.02 310)',
      accent: 'oklch(0.965 0.008 310)',
      accentForeground: 'oklch(0.22 0.015 310)',
      border: 'oklch(0.92 0.01 310)',
      input: 'oklch(0.92 0.01 310)',
      sidebar: 'oklch(0.975 0.006 310)',
      sidebarForeground: 'oklch(0.22 0.015 310)',
      sidebarAccent: 'oklch(0.95 0.008 310)',
      sidebarAccentForeground: 'oklch(0.22 0.015 310)',
      sidebarBorder: 'oklch(0.92 0.01 310)'
    },
    dark: {
      background: 'oklch(0.145 0.008 310)',
      foreground: 'oklch(0.985 0.005 310)',
      card: 'oklch(0.17 0.01 310)',
      cardForeground: 'oklch(0.985 0.005 310)',
      popover: 'oklch(0.17 0.01 310)',
      popoverForeground: 'oklch(0.985 0.005 310)',
      secondary: 'oklch(0.22 0.012 310)',
      secondaryForeground: 'oklch(0.985 0.005 310)',
      muted: 'oklch(0.22 0.012 310)',
      mutedForeground: 'oklch(0.7 0.015 310)',
      accent: 'oklch(0.22 0.012 310)',
      accentForeground: 'oklch(0.985 0.005 310)',
      border: 'oklch(0.28 0.012 310)',
      input: 'oklch(0.28 0.012 310)',
      sidebar: 'oklch(0.18 0.01 310)',
      sidebarForeground: 'oklch(0.985 0.005 310)',
      sidebarAccent: 'oklch(0.24 0.012 310)',
      sidebarAccentForeground: 'oklch(0.985 0.005 310)',
      sidebarBorder: 'oklch(0.28 0.012 310)'
    }
  },
  {
    name: 'olive',
    label: 'Olive',
    swatch: '#717565',
    light: {
      background: 'oklch(0.988 0.005 110)',
      foreground: 'oklch(0.22 0.015 110)',
      card: 'oklch(0.988 0.005 110)',
      cardForeground: 'oklch(0.22 0.015 110)',
      popover: 'oklch(0.988 0.005 110)',
      popoverForeground: 'oklch(0.22 0.015 110)',
      secondary: 'oklch(0.965 0.008 110)',
      secondaryForeground: 'oklch(0.22 0.015 110)',
      muted: 'oklch(0.965 0.008 110)',
      mutedForeground: 'oklch(0.55 0.02 110)',
      accent: 'oklch(0.965 0.008 110)',
      accentForeground: 'oklch(0.22 0.015 110)',
      border: 'oklch(0.92 0.01 110)',
      input: 'oklch(0.92 0.01 110)',
      sidebar: 'oklch(0.975 0.006 110)',
      sidebarForeground: 'oklch(0.22 0.015 110)',
      sidebarAccent: 'oklch(0.95 0.008 110)',
      sidebarAccentForeground: 'oklch(0.22 0.015 110)',
      sidebarBorder: 'oklch(0.92 0.01 110)'
    },
    dark: {
      background: 'oklch(0.145 0.008 110)',
      foreground: 'oklch(0.985 0.005 110)',
      card: 'oklch(0.17 0.01 110)',
      cardForeground: 'oklch(0.985 0.005 110)',
      popover: 'oklch(0.17 0.01 110)',
      popoverForeground: 'oklch(0.985 0.005 110)',
      secondary: 'oklch(0.22 0.012 110)',
      secondaryForeground: 'oklch(0.985 0.005 110)',
      muted: 'oklch(0.22 0.012 110)',
      mutedForeground: 'oklch(0.7 0.015 110)',
      accent: 'oklch(0.22 0.012 110)',
      accentForeground: 'oklch(0.985 0.005 110)',
      border: 'oklch(0.28 0.012 110)',
      input: 'oklch(0.28 0.012 110)',
      sidebar: 'oklch(0.18 0.01 110)',
      sidebarForeground: 'oklch(0.985 0.005 110)',
      sidebarAccent: 'oklch(0.24 0.012 110)',
      sidebarAccentForeground: 'oklch(0.985 0.005 110)',
      sidebarBorder: 'oklch(0.28 0.012 110)'
    }
  },
  {
    name: 'mist',
    label: 'Mist',
    swatch: '#687579',
    light: {
      background: 'oklch(0.988 0.005 210)',
      foreground: 'oklch(0.22 0.015 210)',
      card: 'oklch(0.988 0.005 210)',
      cardForeground: 'oklch(0.22 0.015 210)',
      popover: 'oklch(0.988 0.005 210)',
      popoverForeground: 'oklch(0.22 0.015 210)',
      secondary: 'oklch(0.965 0.008 210)',
      secondaryForeground: 'oklch(0.22 0.015 210)',
      muted: 'oklch(0.965 0.008 210)',
      mutedForeground: 'oklch(0.55 0.02 210)',
      accent: 'oklch(0.965 0.008 210)',
      accentForeground: 'oklch(0.22 0.015 210)',
      border: 'oklch(0.92 0.01 210)',
      input: 'oklch(0.92 0.01 210)',
      sidebar: 'oklch(0.975 0.006 210)',
      sidebarForeground: 'oklch(0.22 0.015 210)',
      sidebarAccent: 'oklch(0.95 0.008 210)',
      sidebarAccentForeground: 'oklch(0.22 0.015 210)',
      sidebarBorder: 'oklch(0.92 0.01 210)'
    },
    dark: {
      background: 'oklch(0.145 0.008 210)',
      foreground: 'oklch(0.985 0.005 210)',
      card: 'oklch(0.17 0.01 210)',
      cardForeground: 'oklch(0.985 0.005 210)',
      popover: 'oklch(0.17 0.01 210)',
      popoverForeground: 'oklch(0.985 0.005 210)',
      secondary: 'oklch(0.22 0.012 210)',
      secondaryForeground: 'oklch(0.985 0.005 210)',
      muted: 'oklch(0.22 0.012 210)',
      mutedForeground: 'oklch(0.7 0.015 210)',
      accent: 'oklch(0.22 0.012 210)',
      accentForeground: 'oklch(0.985 0.005 210)',
      border: 'oklch(0.28 0.012 210)',
      input: 'oklch(0.28 0.012 210)',
      sidebar: 'oklch(0.18 0.01 210)',
      sidebarForeground: 'oklch(0.985 0.005 210)',
      sidebarAccent: 'oklch(0.24 0.012 210)',
      sidebarAccentForeground: 'oklch(0.985 0.005 210)',
      sidebarBorder: 'oklch(0.28 0.012 210)'
    }
  },
  {
    name: 'taupe',
    label: 'Taupe',
    swatch: '#79716c',
    light: {
      background: 'oklch(0.988 0.005 45)',
      foreground: 'oklch(0.22 0.015 45)',
      card: 'oklch(0.988 0.005 45)',
      cardForeground: 'oklch(0.22 0.015 45)',
      popover: 'oklch(0.988 0.005 45)',
      popoverForeground: 'oklch(0.22 0.015 45)',
      secondary: 'oklch(0.965 0.008 45)',
      secondaryForeground: 'oklch(0.22 0.015 45)',
      muted: 'oklch(0.965 0.008 45)',
      mutedForeground: 'oklch(0.55 0.02 45)',
      accent: 'oklch(0.965 0.008 45)',
      accentForeground: 'oklch(0.22 0.015 45)',
      border: 'oklch(0.92 0.01 45)',
      input: 'oklch(0.92 0.01 45)',
      sidebar: 'oklch(0.975 0.006 45)',
      sidebarForeground: 'oklch(0.22 0.015 45)',
      sidebarAccent: 'oklch(0.95 0.008 45)',
      sidebarAccentForeground: 'oklch(0.22 0.015 45)',
      sidebarBorder: 'oklch(0.92 0.01 45)'
    },
    dark: {
      background: 'oklch(0.145 0.008 45)',
      foreground: 'oklch(0.985 0.005 45)',
      card: 'oklch(0.17 0.01 45)',
      cardForeground: 'oklch(0.985 0.005 45)',
      popover: 'oklch(0.17 0.01 45)',
      popoverForeground: 'oklch(0.985 0.005 45)',
      secondary: 'oklch(0.22 0.012 45)',
      secondaryForeground: 'oklch(0.985 0.005 45)',
      muted: 'oklch(0.22 0.012 45)',
      mutedForeground: 'oklch(0.7 0.015 45)',
      accent: 'oklch(0.22 0.012 45)',
      accentForeground: 'oklch(0.985 0.005 45)',
      border: 'oklch(0.28 0.012 45)',
      input: 'oklch(0.28 0.012 45)',
      sidebar: 'oklch(0.18 0.01 45)',
      sidebarForeground: 'oklch(0.985 0.005 45)',
      sidebarAccent: 'oklch(0.24 0.012 45)',
      sidebarAccentForeground: 'oklch(0.985 0.005 45)',
      sidebarBorder: 'oklch(0.28 0.012 45)'
    }
  }
];

export const STYLES_LIST: StyleItem[] = [
  {
    name: 'nova',
    label: 'Nova',
    description: 'Reduced padding and margins',
    defaultRadius: '0.625rem',
    spacing: '0.24rem'
  },
  {
    name: 'vega',
    label: 'Vega',
    description: 'Clean, neutral, and familiar',
    defaultRadius: '0.5rem',
    spacing: '0.25rem'
  },
  {
    name: 'maia',
    label: 'Maia',
    description: 'Rounded, with generous spacing.',
    defaultRadius: '0.875rem',
    spacing: '0.28rem'
  },
  {
    name: 'lyra',
    label: 'Lyra',
    description: 'Boxy and sharp. For mono fonts.',
    locksRadius: true,
    forcedRadius: '0rem',
    defaultRadius: '0rem',
    spacing: '0.22rem'
  },
  {
    name: 'mira',
    label: 'Mira',
    description: 'Made for compact interfaces.',
    defaultRadius: '0.375rem',
    spacing: '0.22rem'
  },
  {
    name: 'luma',
    label: 'Luma',
    description: 'Fluid, luminous, and soft.',
    defaultRadius: '0.625rem',
    spacing: '0.25rem'
  },
  {
    name: 'sera',
    label: 'Sera',
    description: 'Editorial and typographic.',
    locksRadius: true,
    forcedRadius: '0rem',
    defaultRadius: '0rem',
    tracking: '0.025em',
    spacing: '0.26rem'
  },
  {
    name: 'rhea',
    label: 'Rhea',
    description: 'Like Luma but compact.',
    defaultRadius: '0.45rem',
    spacing: '0.23rem'
  }
];

export const RADII_LIST: RadiusItem[] = [
  {
    name: 'none',
    label: 'Radius: None',
    title: 'None',
    value: '0rem',
    previewRadius: '0px'
  },
  {
    name: 'small',
    label: 'Radius: Small',
    title: 'Small',
    value: '0.375rem',
    previewRadius: '2px'
  },
  {
    name: 'medium',
    label: 'Radius: Medium',
    title: 'Medium',
    value: '0.5rem',
    previewRadius: '4px'
  },
  {
    name: 'large',
    label: 'Radius: Large',
    title: 'Large',
    value: '0.75rem',
    previewRadius: '6px'
  },
  {
    name: 'default',
    label: "Radius: The style's own",
    title: "The style's own",
    value: '0.625rem',
    previewRadius: '4px',
    isDashed: true
  }
];

export interface CustomizerState {
  theme: string;
  base: string;
  style: string;
  radius: 'none' | 'small' | 'medium' | 'large' | 'default';
}

export const DEFAULT_CUSTOMIZER_STATE: CustomizerState = {
  theme: 'cyan',
  base: 'taupe',
  style: 'nova',
  radius: 'default'
};

// Preset encode and decode
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function encodePreset(state: CustomizerState): string {
  const themeIdx = Math.max(
    0,
    THEMES_LIST.findIndex((t) => t.name === state.theme)
  );
  const baseIdx = Math.max(
    0,
    BASES_LIST.findIndex((b) => b.name === state.base)
  );
  const styleIdx = Math.max(
    0,
    STYLES_LIST.findIndex((s) => s.name === state.style)
  );
  const radiusIdx = Math.max(
    0,
    RADII_LIST.findIndex((r) => r.name === state.radius)
  );

  const c1 = B64_CHARS[themeIdx % B64_CHARS.length];
  const c2 = B64_CHARS[baseIdx % B64_CHARS.length];
  const c3 = B64_CHARS[styleIdx % B64_CHARS.length];
  const c4 = B64_CHARS[radiusIdx % B64_CHARS.length];

  return `b1${c1}${c2}${c3}${c4}vK`;
}

export function decodePreset(code: string): CustomizerState | null {
  const clean = code.trim().replace(/^--preset\s*/, '');
  if (!clean.startsWith('b1') || clean.length < 6) return null;

  const tChar = clean[2];
  const bChar = clean[3];
  const sChar = clean[4];
  const rChar = clean[5];

  const tIdx = B64_CHARS.indexOf(tChar);
  const bIdx = B64_CHARS.indexOf(bChar);
  const sIdx = B64_CHARS.indexOf(sChar);
  const rIdx = B64_CHARS.indexOf(rChar);

  if (tIdx === -1 || bIdx === -1 || sIdx === -1 || rIdx === -1) return null;

  const theme = THEMES_LIST[tIdx % THEMES_LIST.length]?.name || DEFAULT_CUSTOMIZER_STATE.theme;
  const base = BASES_LIST[bIdx % BASES_LIST.length]?.name || DEFAULT_CUSTOMIZER_STATE.base;
  const style = STYLES_LIST[sIdx % STYLES_LIST.length]?.name || DEFAULT_CUSTOMIZER_STATE.style;
  const radius = RADII_LIST[rIdx % RADII_LIST.length]?.name || DEFAULT_CUSTOMIZER_STATE.radius;

  return { theme, base, style, radius };
}

export function generateCssSnippet(state: CustomizerState, isDark = false): string {
  const themeObj = THEMES_LIST.find((t) => t.name === state.theme) || THEMES_LIST[3];
  const baseObj = BASES_LIST.find((b) => b.name === state.base) || BASES_LIST[0];
  const styleObj = STYLES_LIST.find((s) => s.name === state.style) || STYLES_LIST[0];
  const radiusObj = RADII_LIST.find((r) => r.name === state.radius) || RADII_LIST[4];

  const themeVals = isDark ? themeObj.dark : themeObj.light;
  const baseVals = isDark ? baseObj.dark : baseObj.light;
  const radiusVal = styleObj.locksRadius
    ? styleObj.forcedRadius || '0rem'
    : state.radius === 'default'
      ? styleObj.defaultRadius || '0.625rem'
      : radiusObj.value;

  return `:root {
  --background: ${baseVals.background};
  --foreground: ${baseVals.foreground};
  --card: ${baseVals.card};
  --card-foreground: ${baseVals.cardForeground};
  --popover: ${baseVals.popover};
  --popover-foreground: ${baseVals.popoverForeground};
  --primary: ${themeVals.primary};
  --primary-foreground: ${themeVals.primaryForeground};
  --secondary: ${baseVals.secondary};
  --secondary-foreground: ${baseVals.secondaryForeground};
  --muted: ${baseVals.muted};
  --muted-foreground: ${baseVals.mutedForeground};
  --accent: ${baseVals.accent};
  --accent-foreground: ${baseVals.accentForeground};
  --border: ${baseVals.border};
  --input: ${baseVals.input};
  --ring: ${themeVals.ring};
  --sidebar-background: ${baseVals.sidebar};
  --sidebar-foreground: ${baseVals.sidebarForeground};
  --sidebar-primary: ${themeVals.sidebarPrimary};
  --sidebar-primary-foreground: ${themeVals.sidebarPrimaryForeground};
  --sidebar-accent: ${baseVals.sidebarAccent};
  --sidebar-accent-foreground: ${baseVals.sidebarAccentForeground};
  --sidebar-border: ${baseVals.sidebarBorder};
  --sidebar-ring: ${themeVals.sidebarRing};
  --radius: ${radiusVal};
  --spacing: ${styleObj.spacing || '0.25rem'};
  --tracking-normal: ${styleObj.tracking || '-0.015em'};
}`;
}
