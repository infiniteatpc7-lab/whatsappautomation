'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  CustomizerState,
  DEFAULT_CUSTOMIZER_STATE,
  THEMES_LIST,
  BASES_LIST,
  STYLES_LIST,
  RADII_LIST,
  encodePreset,
  decodePreset,
  generateCssSnippet,
  RadiusItem
} from './theme-customizer-tokens';

interface ThemeCustomizerContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  state: CustomizerState;
  presetCode: string;
  isCustomized: boolean;
  setTheme: (theme: string) => void;
  setBase: (base: string) => void;
  setStyle: (style: string) => void;
  setRadius: (radius: RadiusItem['name']) => void;
  shuffle: () => void;
  reset: () => void;
  applyPreset: (code: string) => boolean;
  copyCss: () => Promise<void>;
  copyPreset: () => Promise<void>;
}

const ThemeCustomizerContext = createContext<ThemeCustomizerContextType | undefined>(undefined);

const STORAGE_KEY = 'shadcn_customizer_state';
const STYLE_TAG_ID = 'shadcn-dynamic-customizer-style';

function applyStylesToDocument(state: CustomizerState, isDark: boolean) {
  if (typeof document === 'undefined') return;

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

  // 1. Update/create dynamic style element for high-precedence variable override
  let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = STYLE_TAG_ID;
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = `
    :root, [data-theme] {
      --background: ${baseVals.background} !important;
      --foreground: ${baseVals.foreground} !important;
      --card: ${baseVals.card} !important;
      --card-foreground: ${baseVals.cardForeground} !important;
      --popover: ${baseVals.popover} !important;
      --popover-foreground: ${baseVals.popoverForeground} !important;
      --primary: ${themeVals.primary} !important;
      --primary-foreground: ${themeVals.primaryForeground} !important;
      --secondary: ${baseVals.secondary} !important;
      --secondary-foreground: ${baseVals.secondaryForeground} !important;
      --muted: ${baseVals.muted} !important;
      --muted-foreground: ${baseVals.mutedForeground} !important;
      --accent: ${baseVals.accent} !important;
      --accent-foreground: ${baseVals.accentForeground} !important;
      --border: ${baseVals.border} !important;
      --input: ${baseVals.input} !important;
      --ring: ${themeVals.ring} !important;
      --sidebar: ${baseVals.sidebar} !important;
      --sidebar-background: ${baseVals.sidebar} !important;
      --sidebar-foreground: ${baseVals.sidebarForeground} !important;
      --sidebar-primary: ${themeVals.sidebarPrimary} !important;
      --sidebar-primary-foreground: ${themeVals.sidebarPrimaryForeground} !important;
      --sidebar-accent: ${baseVals.sidebarAccent} !important;
      --sidebar-accent-foreground: ${baseVals.sidebarAccentForeground} !important;
      --sidebar-border: ${baseVals.sidebarBorder} !important;
      --sidebar-ring: ${themeVals.sidebarRing} !important;
      --radius: ${state.radius === 'none' ? '0px' : radiusVal} !important;
      --radius-sm: ${state.radius === 'none' ? '0px' : `max(0px, calc(${radiusVal} - 4px))`} !important;
      --radius-md: ${state.radius === 'none' ? '0px' : `max(0px, calc(${radiusVal} - 2px))`} !important;
      --radius-lg: ${state.radius === 'none' ? '0px' : radiusVal} !important;
      --radius-xl: ${state.radius === 'none' ? '0px' : `calc(${radiusVal} + 4px)`} !important;
      --spacing: ${styleObj.spacing || '0.25rem'} !important;
      --tracking-normal: ${styleObj.tracking || '-0.015em'} !important;
    }
    ${styleObj.locksRadius || state.radius === 'none' ? 'button, input, select, textarea, [data-slot="button"], [data-slot="input"], [data-slot="card"], [data-slot="badge"], .rounded-lg, .rounded-md, .rounded-sm, .rounded-xl { border-radius: 0px !important; }' : ''}
    ${styleObj.locksRadius ? '* { border-radius: 0px !important; }' : ''}
  `;

  // 2. Manage style and radius classes on documentElement and body
  const html = document.documentElement;
  const body = document.body;

  // Remove existing style/theme/bg/radius classes
  Array.from(html.classList)
    .filter((c) => c.startsWith('style-') || c.startsWith('radius-'))
    .forEach((c) => html.classList.remove(c));

  Array.from(body.classList)
    .filter(
      (c) =>
        c.startsWith('theme-') ||
        c.startsWith('bg-') ||
        c.startsWith('style-') ||
        c.startsWith('radius-')
    )
    .forEach((c) => body.classList.remove(c));

  // Add new classes
  html.classList.add(`style-${state.style}`, `radius-${state.radius}`);
  body.classList.add(
    `theme-${state.theme}`,
    `bg-${state.base}`,
    `style-${state.style}`,
    `radius-${state.radius}`
  );
}

export function ThemeCustomizerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<CustomizerState>(DEFAULT_CUSTOMIZER_STATE);
  const { resolvedTheme } = useTheme();

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.theme && parsed.base && parsed.style && parsed.radius) {
          setState(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Sync to document styles
  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    applyStylesToDocument(state, isDark);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore
    }
  }, [state, resolvedTheme]);

  // Global hotkey 'c' / 'C'
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'c' || e.key === 'C') {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable ||
            target.closest('[contenteditable="true"]'))
        ) {
          return;
        }
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  const setTheme = useCallback((theme: string) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const setBase = useCallback((base: string) => {
    setState((prev) => ({ ...prev, base }));
  }, []);

  const setStyle = useCallback((style: string) => {
    const targetStyle = STYLES_LIST.find((s) => s.name === style);
    setState((prev) => ({
      ...prev,
      style,
      radius: targetStyle?.locksRadius ? 'none' : prev.radius
    }));
  }, []);

  const setRadius = useCallback((radius: RadiusItem['name']) => {
    setState((prev) => ({ ...prev, radius }));
  }, []);

  const shuffle = useCallback(() => {
    const randomTheme = THEMES_LIST[Math.floor(Math.random() * THEMES_LIST.length)].name;
    const randomBase = BASES_LIST[Math.floor(Math.random() * BASES_LIST.length)].name;
    const randomStyle = STYLES_LIST[Math.floor(Math.random() * STYLES_LIST.length)].name;
    const randomRadius = RADII_LIST[Math.floor(Math.random() * RADII_LIST.length)].name;

    setState({
      theme: randomTheme,
      base: randomBase,
      style: randomStyle,
      radius: randomRadius
    });
    toast.success('Random theme preset applied');
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_CUSTOMIZER_STATE);
    toast.info('Theme reset to default');
  }, []);

  const applyPreset = useCallback((code: string): boolean => {
    const decoded = decodePreset(code);
    if (!decoded) {
      toast.error('Invalid preset code');
      return false;
    }
    setState(decoded);
    toast.success('Preset applied');
    return true;
  }, []);

  const presetCode = useMemo(() => encodePreset(state), [state]);

  const isCustomized = useMemo(() => {
    return (
      state.theme !== DEFAULT_CUSTOMIZER_STATE.theme ||
      state.base !== DEFAULT_CUSTOMIZER_STATE.base ||
      state.style !== DEFAULT_CUSTOMIZER_STATE.style ||
      state.radius !== DEFAULT_CUSTOMIZER_STATE.radius
    );
  }, [state]);

  const copyCss = useCallback(async () => {
    try {
      const isDark = resolvedTheme === 'dark';
      const snippet = generateCssSnippet(state, isDark);
      await navigator.clipboard.writeText(snippet);
      toast.success('CSS variables copied to clipboard');
    } catch {
      toast.error('Failed to copy CSS to clipboard');
    }
  }, [state, resolvedTheme]);

  const copyPreset = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`--preset ${presetCode}`);
      toast.success('Preset code copied to clipboard');
    } catch {
      toast.error('Failed to copy preset to clipboard');
    }
  }, [presetCode]);

  return (
    <ThemeCustomizerContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggleOpen,
        state,
        presetCode,
        isCustomized,
        setTheme,
        setBase,
        setStyle,
        setRadius,
        shuffle,
        reset,
        applyPreset,
        copyCss,
        copyPreset
      }}
    >
      {children}
    </ThemeCustomizerContext.Provider>
  );
}

export function useThemeCustomizer() {
  const context = useContext(ThemeCustomizerContext);
  if (!context) {
    throw new Error('useThemeCustomizer must be used within a ThemeCustomizerProvider');
  }
  return context;
}
