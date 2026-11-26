import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export type PreviewTheme = 'dark' | 'light';

interface IPhonePreviewProps {
  verifiedName?: string | null;
  headerType: 'NONE' | 'TEXT';
  headerText: string;
  bodyContent: React.ReactNode;
  footerText?: string;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  theme?: PreviewTheme;
  onThemeChange?: (theme: PreviewTheme) => void;
  screenHeight?: string;
  className?: string;
  showThemeToggle?: boolean;
}

export function IPhonePreview({
  verifiedName = 'Business Account',
  headerType,
  headerText,
  bodyContent,
  footerText,
  buttons = [],
  theme: controlledTheme,
  onThemeChange,
  screenHeight = 'h-[640px]',
  className,
  showThemeToggle = true,
}: IPhonePreviewProps) {
  const { resolvedTheme } = useTheme();

  // Initialize with dashboard theme or controlled prop
  const [internalTheme, setInternalTheme] = useState<PreviewTheme>(
    controlledTheme || (resolvedTheme === 'light' ? 'light' : 'dark')
  );

  // Automatically sync with dashboard theme when user toggles dark/light mode in the app
  useEffect(() => {
    if (resolvedTheme === 'dark' || resolvedTheme === 'light') {
      setInternalTheme(resolvedTheme);
      if (onThemeChange) {
        onThemeChange(resolvedTheme);
      }
    }
  }, [resolvedTheme, onThemeChange]);

  const currentTheme = controlledTheme || internalTheme;
  const isDark = currentTheme === 'dark';

  const handleThemeChange = (newTheme: PreviewTheme) => {
    setInternalTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  return (
    <div className={cn('relative max-w-[340px] sm:max-w-[365px] mx-auto w-full select-none', className)}>
      {/* Theme Toggle Pill Bar (Directly Above Phone) */}
      {showThemeToggle && (
        <div className='flex items-center justify-between mb-2.5 px-1'>
          <span className='text-xs font-semibold text-foreground flex items-center gap-2 whitespace-nowrap'>
            <span className='size-2 rounded-full bg-emerald-500 animate-pulse' />
            Live WhatsApp Preview
          </span>
          <div className='inline-flex items-center p-0.5 rounded-lg bg-muted border border-border/50 text-xs shadow-xs'>
            <button
              type='button'
              onClick={() => handleThemeChange('dark')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium text-xs cursor-pointer',
                isDark
                  ? 'bg-neutral-900 text-white shadow-xs dark:bg-neutral-800'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title='WhatsApp Dark Theme'
            >
              <Icons.moon className='size-3 text-sky-400' />
              <span>Dark</span>
            </button>
            <button
              type='button'
              onClick={() => handleThemeChange('light')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium text-xs cursor-pointer',
                !isDark
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title='WhatsApp White Theme'
            >
              <Icons.sun className='size-3 text-amber-500' />
              <span>White</span>
            </button>
          </div>
        </div>
      )}

      {/* iPhone 17 Exterior Titanium Frame */}
      <div className='relative rounded-[52px] p-[10px] bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.1)_inset] border border-neutral-700/80'>
        {/* Subtle Hardware Buttons */}
        {/* Left: Action Button & Volume Up/Down */}
        <div className='absolute -left-[4px] top-24 w-[3.5px] h-7 bg-neutral-600 rounded-l-xs shadow-xs' />
        <div className='absolute -left-[4px] top-36 w-[3.5px] h-11 bg-neutral-600 rounded-l-xs shadow-xs' />
        <div className='absolute -left-[4px] top-51 w-[3.5px] h-11 bg-neutral-600 rounded-l-xs shadow-xs' />
        {/* Right: Power / Siri Lock Button */}
        <div className='absolute -right-[4px] top-38 w-[3.5px] h-16 bg-neutral-600 rounded-r-xs shadow-xs' />

        {/* Inner Screen Bezel */}
        <div
          className={cn(
            'relative rounded-[44px] overflow-hidden border-[2px] border-black flex flex-col transition-colors duration-200',
            screenHeight,
            isDark ? 'bg-[#0c1317] text-white' : 'bg-[#efeae2] text-[#111b21]'
          )}
        >
          {/* 1. iOS Status Bar & Dynamic Island */}
          <div
            className={cn(
              'relative pt-2 pb-1.5 px-6 flex items-center justify-between text-[11px] font-semibold z-20 transition-colors',
              isDark ? 'bg-[#1f2c34] text-white/90' : 'bg-[#f0f2f5] text-[#111b21]'
            )}
          >
            {/* Clock */}
            <span className='tracking-tight font-medium'>9:41</span>

            {/* iPhone 17 Dynamic Island */}
            <div className='absolute left-1/2 -translate-x-1/2 top-2 h-[22px] w-[100px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-md'>
              {/* Camera Lens */}
              <div className='size-2.5 rounded-full bg-[#0d1624] border border-neutral-800 ring-1 ring-white/10' />
              {/* Sensor */}
              <div className='size-2 rounded-full bg-[#14171a]' />
            </div>

            {/* Status Icons: Signal, 5G, Battery */}
            <div className='flex items-center gap-1.5'>
              {/* Cellular Signal (4 bars) */}
              <svg className='size-3.5 fill-current' viewBox='0 0 16 16'>
                <rect x='1' y='11' width='2' height='4' rx='0.5' />
                <rect x='5' y='8' width='2' height='7' rx='0.5' />
                <rect x='9' y='5' width='2' height='10' rx='0.5' />
                <rect x='13' y='2' width='2' height='13' rx='0.5' />
              </svg>

              {/* 5G */}
              <span className='text-[10px] font-bold tracking-tighter'>5G</span>

              {/* Battery Pill */}
              <div className='flex items-center'>
                <div
                  className={cn(
                    'w-5 h-2.5 border rounded-[3px] p-[1px] flex items-center',
                    isDark ? 'border-white/80' : 'border-neutral-800'
                  )}
                >
                  <div
                    className={cn(
                      'h-full w-full rounded-[1.5px]',
                      isDark ? 'bg-white' : 'bg-neutral-800'
                    )}
                  />
                </div>
                <div
                  className={cn(
                    'w-[1px] h-1 rounded-r-xs ml-[0.5px]',
                    isDark ? 'bg-white/80' : 'bg-neutral-800'
                  )}
                />
              </div>
            </div>
          </div>

          {/* 2. WhatsApp iOS Chat Navigation Header */}
          <div
            className={cn(
              'px-3 py-2 flex items-center justify-between border-b z-10 transition-colors',
              isDark
                ? 'bg-[#1f2c34] border-black/30 text-white'
                : 'bg-[#f0f2f5] border-black/10 text-[#111b21]'
            )}
          >
            <div className='flex items-center gap-2 min-w-0'>
              {/* Back Chevron */}
              <div
                className={cn(
                  'flex items-center font-normal text-xs cursor-pointer',
                  isDark ? 'text-[#25D366]' : 'text-[#008069]'
                )}
              >
                <Icons.chevronLeft className='size-4' />
                <span className='-ml-1 text-[11px] font-medium'>9</span>
              </div>

              {/* Business Avatar */}
              <div
                className={cn(
                  'relative size-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0',
                  isDark
                    ? 'bg-[#2a3942] border-[#25D366]/40 text-[#25D366]'
                    : 'bg-[#e9edef] border-[#008069]/40 text-[#008069]'
                )}
              >
                WA
                <div className='absolute -bottom-0.5 -right-0.5 size-3 bg-[#25D366] rounded-full border-2 border-[#1f2c34] flex items-center justify-center'>
                  <svg className='size-2 text-white fill-current' viewBox='0 0 24 24'>
                    <path d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' />
                  </svg>
                </div>
              </div>

              {/* Contact Info */}
              <div className='min-w-0 flex-1 leading-tight'>
                <div className='flex items-center gap-1'>
                  <span
                    className={cn(
                      'font-semibold text-xs truncate max-w-[125px]',
                      isDark ? 'text-white' : 'text-[#111b21]'
                    )}
                  >
                    {verifiedName || 'Business Account'}
                  </span>
                  <Icons.badgeCheck className='size-3 text-[#25D366] shrink-0' />
                </div>
                <div
                  className={cn(
                    'text-[10px] truncate',
                    isDark ? 'text-white/60' : 'text-[#667781]'
                  )}
                >
                  Official Business Account
                </div>
              </div>
            </div>

            {/* Video & Phone Call Action Icons */}
            <div
              className={cn(
                'flex items-center gap-3.5 pr-1',
                isDark ? 'text-[#25D366]' : 'text-[#008069]'
              )}
            >
              <Icons.video className='size-4 cursor-pointer hover:opacity-80' />
              <Icons.phone className='size-3.5 cursor-pointer hover:opacity-80' />
            </div>
          </div>

          {/* 3. WhatsApp Chat Canvas with Official Doodle Wallpaper */}
          <div
            className={cn(
              'relative flex-1 min-h-0 overflow-hidden transition-colors',
              isDark ? 'bg-[#0c1317]' : 'bg-[#efeae2]'
            )}
          >
            {/* WhatsApp Doodle Wallpaper Layer (Fixed to chat canvas, does not scroll) */}
            <div
              className='pointer-events-none absolute inset-0 z-0'
              style={{
                maskImage: "url('/images/wa-bg.svg')",
                WebkitMaskImage: "url('/images/wa-bg.svg')",
                maskRepeat: 'repeat',
                WebkitMaskRepeat: 'repeat',
                maskSize: '374px 666px',
                WebkitMaskSize: '374px 666px',
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(17, 27, 33, 0.08)',
                opacity: isDark ? 0.85 : 0.8,
              }}
            />

            {/* Scrollable Message Area (z-10 above the fixed doodle) */}
            <div className='relative z-10 h-full overflow-y-auto p-3 flex flex-col'>
              <div className='space-y-2.5 pb-1 mt-auto'>
                {/* PREVIEW Pill Badge (Centered on top of the chat area, matching user's screenshot without border) */}
                <div className='flex justify-center select-none'>
                  <span
                    className={cn(
                      'rounded-md px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors',
                      isDark
                        ? 'bg-[#182836] text-[#38bdf8]'
                        : 'bg-[#d8eefc] text-[#0284c7]'
                    )}
                  >
                    PREVIEW
                  </span>
                </div>

                {/* WhatsApp Template Message Bubble (Incoming) */}
                <div
                  className={cn(
                    'relative max-w-[285px] rounded-lg rounded-tl-none shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] transition-all ml-2',
                    isDark
                      ? 'bg-[#242626] text-[#e9edef]'
                      : 'bg-white text-[#111b21]'
                  )}
                >
                  {/* Speech Bubble Tail for Incoming WhatsApp Message */}
                  <svg
                    className={cn(
                      'absolute -left-[8px] top-0 w-[9px] h-[13px] pointer-events-none z-10',
                      isDark ? 'text-[#242626]' : 'text-white'
                    )}
                    viewBox='0 0 8 13'
                    fill='currentColor'
                  >
                    <path d='M1.533 3.568L8 12.19V0H2.883a2 2 0 0 0-1.35.532l-.001.001a1.996 1.996 0 0 0-.001 2.825l.002.001v.209z' />
                  </svg>

                  {/* Main Content Area */}
                  <div className='p-3.5 space-y-2.5'>
                    {/* Message Header (if text) */}
                    {headerType === 'TEXT' && headerText && (
                      <div
                        className={cn(
                          'font-bold text-sm pb-1.5 border-b leading-snug',
                          isDark ? 'text-white border-white/10' : 'text-[#111b21] border-neutral-100'
                        )}
                      >
                        {headerText}
                      </div>
                    )}

                    {/* Message Body */}
                    <div
                      className={cn(
                        'text-[13px] leading-relaxed',
                        isDark ? 'text-[#e9edef]' : 'text-[#111b21]'
                      )}
                    >
                      {bodyContent}
                    </div>

                    {/* Message Footer */}
                    {footerText && (
                      <div
                        className={cn(
                          'text-[11px] pt-1 leading-normal',
                          isDark ? 'text-white/50' : 'text-[#667781]'
                        )}
                      >
                        {footerText}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div
                      className={cn(
                        'flex items-center justify-end gap-1 text-[10px] pt-0.5',
                        isDark ? 'text-white/50' : 'text-[#667781]'
                      )}
                    >
                      <span>9:41 AM</span>
                    </div>
                  </div>

                  {/* Integrated Action Buttons at the Bottom (Separated by Divider, Matching User's Screenshot) */}
                  {buttons.length > 0 && (
                    <div className='border-t divide-y border-neutral-100 dark:border-white/10 dark:divide-white/10 bg-transparent'>
                      {buttons.map((btn, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-full py-2.5 px-3 text-center text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none',
                            isDark
                              ? 'text-[#00a884] hover:bg-white/5'
                              : 'text-[#008069] hover:bg-neutral-50'
                          )}
                        >
                          {btn.type === 'URL' && <Icons.externalLink className='size-3.5 shrink-0 stroke-[2.2]' />}
                          {btn.type === 'PHONE_NUMBER' && <Icons.phone className='size-3.5 shrink-0 stroke-[2.2]' />}
                          {btn.type === 'QUICK_REPLY' && <Icons.reply className='size-3.5 shrink-0 stroke-[2.2]' />}
                          <span className='truncate'>{btn.text || `Button ${i + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. WhatsApp iOS Message Composer Bar */}
          <div
            className={cn(
              'px-3 py-2 border-t flex items-center gap-2 z-10 transition-colors',
              isDark
                ? 'bg-[#1f2c34] border-black/30'
                : 'bg-[#f0f2f5] border-black/10'
            )}
          >
            {/* Attachment Button */}
            <button
              type='button'
              className={cn(
                'size-7 rounded-full flex items-center justify-center shrink-0 transition-colors',
                isDark ? 'text-white/70 hover:text-white' : 'text-[#54656f] hover:text-[#111b21]'
              )}
            >
              <Icons.add className='size-5' />
            </button>

            {/* Text Input Mockup */}
            <div
              className={cn(
                'flex-1 h-8 rounded-full px-3 flex items-center text-xs transition-colors',
                isDark
                  ? 'bg-[#2a3942] text-white/40'
                  : 'bg-white text-[#8696a0] border border-neutral-200/60 shadow-xs'
              )}
            >
              Message
            </div>

            {/* Mic / Send Button */}
            <div
              className={cn(
                'size-8 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-colors',
                isDark ? 'bg-[#25D366] text-[#0b141a]' : 'bg-[#008069] text-white'
              )}
            >
              <Icons.mic className='size-4' />
            </div>
          </div>

          {/* 5. iPhone Home Indicator Bar */}
          <div
            className={cn(
              'pb-1.5 pt-0.5 flex justify-center z-10 transition-colors',
              isDark ? 'bg-[#1f2c34]' : 'bg-[#f0f2f5]'
            )}
          >
            <div
              className={cn(
                'w-32 h-1 rounded-full transition-colors',
                isDark ? 'bg-white/40' : 'bg-black/30'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
