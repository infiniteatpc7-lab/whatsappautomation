'use client';

import React, { useState, useEffect } from 'react';
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

  if (!isOpen) return null;

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
    <div className='relative w-full border-b bg-background/95 backdrop-blur-md z-40 transition-all duration-200 animate-in fade-in slide-in-from-top-2'>
      <div className='w-full px-4 py-4 max-w-7xl mx-auto'>
        <div className='flex items-start justify-between gap-6 lg:gap-8 overflow-x-auto'>
          {/* 1. THEME (Accent Swatches) */}
          <fieldset className='flex flex-col gap-1.5 shrink-0'>
            <legend className='text-xs font-medium text-muted-foreground select-none'>
              Theme
            </legend>
              <div className='grid grid-cols-9 gap-1.5 pt-1'>
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
                            className={cn(
                              'group relative flex size-5.5 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                              isSelected &&
                                'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                            )}
                          >
                            <span
                              className='size-full rounded-full border border-black/10 dark:border-white/20 shadow-xs'
                              style={{ backgroundColor: themeItem.swatch }}
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

            {/* 2. Base (Neutral Swatches) */}
            <fieldset className='flex flex-col gap-1.5 shrink-0'>
              <legend className='text-xs font-medium text-muted-foreground select-none'>
                Base
              </legend>
              <div className='flex items-center gap-1.5 pt-1'>
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
                            className={cn(
                              'group relative flex size-5.5 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                              isSelected &&
                                'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                            )}
                          >
                            <span
                              className='size-full rounded-full border border-black/10 dark:border-white/20 shadow-xs'
                              style={{ backgroundColor: baseItem.swatch }}
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

            {/* 3. Style */}
            <fieldset className='flex flex-col gap-1.5 shrink-0'>
              <legend className='text-xs font-medium text-muted-foreground select-none'>
                Style
              </legend>
              <div className='grid grid-cols-4 gap-1 pt-0.5'>
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
                        'h-7 rounded px-2 text-xs font-medium transition-colors text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                        isSelected
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {styleItem.label}
                    </button>
                  );
                })}
              </div>
              <p className='text-[11px] text-muted-foreground/80 italic min-h-[16px] transition-all pt-0.5 max-w-[210px]'>
                {displayedStyleNote}
              </p>
            </fieldset>

            {/* 4. Radius */}
            <fieldset className='flex flex-col gap-1.5 shrink-0'>
              <legend className='text-xs font-medium text-muted-foreground select-none'>
                Radius
              </legend>
              <div className='flex items-center gap-1.5 pt-1'>
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
                              'flex size-7 items-center justify-center rounded-md border border-transparent transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                              isLocked
                                ? isSelected
                                  ? 'bg-muted border-border ring-1 ring-primary/40 cursor-not-allowed opacity-80'
                                  : 'cursor-not-allowed opacity-30'
                                : 'hover:bg-muted',
                              !isLocked &&
                                isSelected &&
                                'bg-muted border-border ring-1 ring-primary/40'
                            )}
                          >
                            <span
                              className={cn(
                                'size-4 border border-foreground/60 transition-all',
                                r.isDashed && 'border-dashed border-foreground/70',
                                isSelected && 'border-primary'
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

            {/* 5. PRESET & ACTIONS */}
            <div className='flex flex-col gap-2 min-w-[240px]'>
              <h3 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none'>
                Preset
              </h3>
              <div className='flex items-center gap-1 pt-0.5'>
                <div className='flex h-8 flex-1 items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 font-mono text-xs focus-within:bg-background focus-within:ring-1 focus-within:ring-ring transition-colors'>
                  <span className='select-none text-muted-foreground/70 shrink-0'>--preset</span>
                  <input
                    type='text'
                    aria-label='Preset code'
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onBlur={handleInputBlur}
                    placeholder='preset code'
                    className='w-full min-w-0 bg-transparent text-foreground outline-none font-mono placeholder:text-muted-foreground/40'
                  />
                </div>

                {/* Copy CSS Button */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type='button'
                        aria-label='Copy CSS'
                        onClick={handleCopyCss}
                        className='flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors'
                      >
                        {copiedCss ? (
                          <IconCheck className='size-3.5 text-green-500' />
                        ) : (
                          <span className='font-mono text-xs font-bold'>{`{}`}</span>
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
                        className='flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors'
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

              {/* Shuffle & Reset Buttons */}
              <div className='flex items-center gap-2 pt-0.5'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={shuffle}
                  className='h-7 px-2.5 text-xs font-medium'
                >
                  Shuffle
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={reset}
                  className='h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground'
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Close Panel Button */}
          <button
            type='button'
            onClick={() => setIsOpen(false)}
            aria-label='Close customization panel'
            className='size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors shrink-0'
          >
            <IconX className='size-4' />
          </button>
        </div>
      </div>
    </div>
  );
}
