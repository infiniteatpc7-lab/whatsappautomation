'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useThemeCustomizer } from './theme-customizer-context';
import {
  THEMES_LIST,
  BASES_LIST,
  STYLES_LIST,
  RADII_LIST,
  RadiusItem
} from './theme-customizer-tokens';
import { IconCheck, IconX } from '@tabler/icons-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

export function CustomizeWandIcon({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={cn('size-4', className)}
      aria-hidden='true'
      {...props}
    >
      {/* Magic wand body */}
      <path d='m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72' />
      {/* Wand tip division */}
      <path d='m14 7 3 3' />
      {/* 4-point star sparkle */}
      <path d='M6.5 4.5v4M4.5 6.5h4' />
      {/* Small dot sparkle */}
      <circle cx='10.5' cy='3.5' r='1' fill='currentColor' stroke='none' />
    </svg>
  );
}

export function ThemeCustomizerTrigger() {
  const { isOpen, toggleOpen, isCustomized } = useThemeCustomizer();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            onClick={toggleOpen}
            aria-label='Customize'
            aria-expanded={isOpen}
            data-customizer-trigger='true'
            className={cn(
              'relative size-8 text-muted-foreground hover:text-foreground transition-colors',
              isOpen && 'bg-muted text-foreground ring-1 ring-border'
            )}
          >
            <CustomizeWandIcon className='size-4' />
            {isCustomized && (
              <span
                className='absolute bottom-1 right-1 size-2 rounded-full bg-primary ring-2 ring-background'
                aria-hidden='true'
              />
            )}
          </Button>
        }
      />
      <TooltipContent side='bottom' align='center' className='flex items-center gap-1.5'>
        <span>Customize</span>
        <Kbd>C</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

export function ThemeCustomizerPanel() {
  const {
    isOpen,
    setIsOpen,
    state,
    presetCode,
    setTheme,
    setBase,
    setStyle,
    setRadius,
    shuffle,
    reset,
    applyPreset,
    copyCss,
    copyPreset
  } = useThemeCustomizer();

  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState(presetCode);
  const [copiedCss, setCopiedCss] = useState(false);
  const [copiedPreset, setCopiedPreset] = useState(false);

  // Sync input value when presetCode updates externally
  useEffect(() => {
    setInputCode(presetCode);
  }, [presetCode]);

  const [mounted, setMounted] = useState(isOpen);
  const [animatingOpen, setAnimatingOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync mounted state with isOpen to support smooth opening and exit transitions
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        setAnimatingOpen(true);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setAnimatingOpen(false);
      timer = setTimeout(() => {
        setMounted(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside in the dashboard to smoothly close
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks inside the customizer panel
      if (panelRef.current && panelRef.current.contains(target)) return;

      // Ignore clicks on the customize trigger button (it handles its own toggle)
      if (target.closest('[aria-label="Customize"]') || target.closest('[data-customizer-trigger]')) {
        return;
      }

      // Smoothly close
      setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isOpen, setIsOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!mounted) return null;

  const currentStyleObj = STYLES_LIST.find((s) => s.name === state.style) || STYLES_LIST[0];
  const displayedStyleNote =
    (hoveredStyle && STYLES_LIST.find((s) => s.name === hoveredStyle)?.description) ||
    currentStyleObj.description;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyPreset(inputCode);
    }
  };

  const handleInputBlur = () => {
    if (inputCode.trim() !== presetCode) {
      applyPreset(inputCode);
    }
  };

  const handleCopyCss = async () => {
    await copyCss();
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const handleCopyPreset = async () => {
    await copyPreset();
    setCopiedPreset(true);
    setTimeout(() => setCopiedPreset(false), 2000);
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute top-14 left-0 right-0 w-full border-b bg-background/95 backdrop-blur-md z-50 shadow-xl overflow-hidden',
        'grid transition-[grid-template-rows,opacity] duration-240 ease-[cubic-bezier(0.4,0,0.6,1)]',
        animatingOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
      )}
    >
      <div className='overflow-hidden min-h-0'>
        <div
          className={cn(
            'w-full px-6 py-5 max-w-7xl mx-auto transition-all duration-240 ease-[cubic-bezier(0.4,0,0.6,1)]',
            animatingOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          )}
        >
          <div className='flex flex-wrap items-start justify-between gap-y-6 gap-x-8 lg:gap-x-12 overflow-x-auto'>
          {/* 1. THEME (Accent Swatches: 6 cols x 3 rows) */}
          <fieldset className='flex flex-col gap-2 shrink-0'>
            <legend className='text-xs font-semibold text-muted-foreground select-none'>
              Theme
            </legend>
            <div
              className='grid gap-3 pt-0.5'
              style={{ gridTemplateColumns: 'repeat(6, 18px)' }}
            >
              {THEMES_LIST.map((themeItem) => {
                const isSelected = state.theme === themeItem.name;
                return (
                  <Tooltip key={themeItem.name}>
                    <TooltipTrigger
                      render={
                        <button
                          type='button'
                          aria-label={themeItem.label}
                          aria-pressed={isSelected}
                          onClick={() => setTheme(themeItem.name)}
                          className='group relative flex size-[18px] items-center justify-center transition-transform hover:scale-110 focus-visible:outline-none cursor-pointer'
                          style={{
                            borderRadius: state.radius === 'none' ? '0px' : 'calc(var(--radius, 0.625rem) * 100)',
                            boxShadow: isSelected
                              ? '0 0 0 2px var(--background), 0 0 0 3.5px var(--foreground)'
                              : undefined
                          }}
                        >
                          <span
                            className='size-full border border-black/10 dark:border-white/15'
                            style={{
                              backgroundColor: themeItem.swatch,
                              borderRadius: 'inherit'
                            }}
                          />
                        </button>
                      }
                    />
                    <TooltipContent side='bottom' className='text-xs'>
                      {themeItem.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </fieldset>

          {/* 2. BASE (Neutral Swatches: 5 cols, 7 items) */}
          <fieldset className='flex flex-col gap-2 shrink-0'>
            <legend className='text-xs font-semibold text-muted-foreground select-none'>
              Base
            </legend>
            <div
              className='grid gap-3 pt-0.5'
              style={{ gridTemplateColumns: 'repeat(5, 18px)' }}
            >
              {BASES_LIST.map((baseItem) => {
                const isSelected = state.base === baseItem.name;
                return (
                  <Tooltip key={baseItem.name}>
                    <TooltipTrigger
                      render={
                        <button
                          type='button'
                          aria-label={baseItem.label}
                          aria-pressed={isSelected}
                          onClick={() => setBase(baseItem.name)}
                          className='group relative flex size-[18px] items-center justify-center transition-transform hover:scale-110 focus-visible:outline-none cursor-pointer'
                          style={{
                            borderRadius: state.radius === 'none' ? '0px' : 'calc(var(--radius, 0.625rem) * 100)',
                            boxShadow: isSelected
                              ? '0 0 0 2px var(--background), 0 0 0 3.5px var(--foreground)'
                              : undefined
                          }}
                        >
                          <span
                            className='size-full border border-black/10 dark:border-white/15'
                            style={{
                              backgroundColor: baseItem.swatch,
                              borderRadius: 'inherit'
                            }}
                          />
                        </button>
                      }
                    />
                    <TooltipContent side='bottom' className='text-xs'>
                      {baseItem.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </fieldset>

          {/* 3. STYLE (4 cols x 2 rows, clean text links) */}
          <fieldset className='flex flex-col gap-2 shrink-0'>
            <legend className='text-xs font-semibold text-muted-foreground select-none'>
              Style
            </legend>
            <div className='grid grid-cols-4 gap-x-4.5 gap-y-0.5 pt-0.5'>
              {STYLES_LIST.map((styleItem) => {
                const isSelected = state.style === styleItem.name;
                return (
                  <button
                    key={styleItem.name}
                    type='button'
                    aria-pressed={isSelected}
                    onClick={() => setStyle(styleItem.name)}
                    onMouseEnter={() => setHoveredStyle(styleItem.name)}
                    onMouseLeave={() => setHoveredStyle(null)}
                    className={cn(
                      'py-1 text-xs font-semibold leading-normal transition-colors text-left focus-visible:outline-none cursor-pointer',
                      'hover:underline hover:underline-offset-3',
                      isSelected
                        ? 'text-primary'
                        : 'text-[#c5c5c2] dark:text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {styleItem.label}
                  </button>
                );
              })}
            </div>
            <p className='text-xs text-muted-foreground max-w-[210px] min-h-[16px] transition-all pt-1 leading-relaxed'>
              {displayedStyleNote}
            </p>
          </fieldset>

          {/* 4. RADIUS (5 options with 15px corner boxes) */}
          <fieldset className='flex flex-col gap-2 shrink-0'>
            <legend className='text-xs font-semibold text-muted-foreground select-none'>
              Radius
            </legend>
            <div className='flex items-center gap-1 pt-0.5'>
              {RADII_LIST.map((r) => {
                const isLocked = Boolean(currentStyleObj.locksRadius);
                const isSelected = isLocked ? r.name === 'none' : state.radius === r.name;
                return (
                  <Tooltip key={r.name}>
                    <TooltipTrigger
                      render={
                        <button
                          type='button'
                          disabled={isLocked}
                          aria-label={isLocked ? `${r.label} (locked)` : r.label}
                          aria-pressed={isSelected}
                          onClick={() => !isLocked && setRadius(r.name as RadiusItem['name'])}
                          className={cn(
                            'flex size-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none cursor-pointer',
                            isLocked && 'cursor-not-allowed opacity-40',
                            !isLocked && (isSelected ? 'bg-muted/70 ring-1 ring-border' : 'hover:bg-muted/60')
                          )}
                        >
                          <span
                            className={cn(
                              'size-[15px] shrink-0 border-[1.5px] transition-colors',
                              r.isDashed && 'border-dashed',
                              isSelected
                                ? 'border-primary'
                                : 'border-muted-foreground/50'
                            )}
                            style={{ borderRadius: r.previewRadius }}
                          />
                        </button>
                      }
                    />
                    <TooltipContent side='bottom' className='text-xs'>
                      {isLocked ? 'This style sets the radius' : r.title}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </fieldset>

          {/* 5. PRESET & ACTIONS (256px / 16rem width) */}
          <div className='flex flex-col gap-2 shrink-0 w-64'>
            <span className='text-xs font-semibold text-muted-foreground select-none'>
              Preset
            </span>
            <div className='flex items-center gap-1 pt-0.5'>
              <label
                title='Paste a preset code to apply it'
                className='flex h-8 min-w-0 flex-1 cursor-text items-center gap-1.5 rounded-md bg-muted/60 px-2.5 font-mono text-xs focus-within:bg-background focus-within:ring-2 focus-within:ring-ring hover:bg-muted transition-colors'
              >
                <span className='select-none text-muted-foreground shrink-0'>--preset</span>
                <input
                  type='text'
                  aria-label='Preset code'
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onBlur={handleInputBlur}
                  placeholder='preset code'
                  className='w-full min-w-0 bg-transparent text-foreground outline-none font-mono text-xs'
                />
              </label>

              {/* Copy CSS Button */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type='button'
                      aria-label='Copy CSS'
                      onClick={handleCopyCss}
                      className='flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none transition-colors cursor-pointer'
                      title='Copy CSS'
                    >
                      {copiedCss ? (
                        <IconCheck className='size-3.5 text-green-500' />
                      ) : (
                        <span className='font-mono text-xs font-bold leading-none'>{`{}`}</span>
                      )}
                    </button>
                  }
                />
                <TooltipContent side='bottom' className='text-xs'>
                  {copiedCss ? 'Copied!' : 'Copy CSS'}
                </TooltipContent>
              </Tooltip>

              {/* Copy Preset Button */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type='button'
                      aria-label='Copy preset'
                      onClick={handleCopyPreset}
                      className='flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none transition-colors cursor-pointer'
                      title='Copy preset'
                    >
                      {copiedPreset ? (
                        <IconCheck className='size-3.5 text-green-500' />
                      ) : (
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          className='size-3.5'
                          aria-hidden='true'
                        >
                          <rect width='8' height='4' x='8' y='2' rx='1' ry='1' />
                          <path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' />
                        </svg>
                      )}
                    </button>
                  }
                />
                <TooltipContent side='bottom' className='text-xs'>
                  {copiedPreset ? 'Copied!' : 'Copy preset'}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Actions: Shuffle & Reset */}
            <div className='flex items-center gap-4 mt-1'>
              <button
                type='button'
                onClick={shuffle}
                className='text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline underline-offset-3 transition-colors cursor-pointer'
              >
                Shuffle
              </button>
              <button
                type='button'
                onClick={reset}
                className='text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline underline-offset-3 transition-colors cursor-pointer'
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
