import React from 'react';
import { cn } from '@/lib/utils';

interface CrosshairContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CrosshairContainer({
  children,
  className,
  ...props
}: CrosshairContainerProps) {
  return (
    <div
      className={cn(
        'relative w-full max-w-6xl mx-auto border-x border-border/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CrosshairRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hasTopCrosshair?: boolean;
}

export function CrosshairRow({
  children,
  className,
  hasTopCrosshair = false,
  ...props
}: CrosshairRowProps) {
  return (
    <div
      className={cn(
        'relative border-b border-border/40 p-6 md:p-10 transition-colors',
        className
      )}
      {...props}
    >
      {/* Top Crosshairs if needed */}
      {hasTopCrosshair && (
        <>
          <span className='absolute -top-[7.5px] -left-[6.5px] font-mono text-[11px] text-muted-foreground/60 select-none pointer-events-none z-10 leading-none'>
            +
          </span>
          <span className='absolute -top-[7.5px] -right-[6.5px] font-mono text-[11px] text-muted-foreground/60 select-none pointer-events-none z-10 leading-none'>
            +
          </span>
        </>
      )}

      {/* Bottom Crosshairs */}
      <span className='absolute -bottom-[7.5px] -left-[6.5px] font-mono text-[11px] text-muted-foreground/60 select-none pointer-events-none z-10 leading-none'>
        +
      </span>
      <span className='absolute -bottom-[7.5px] -right-[6.5px] font-mono text-[11px] text-muted-foreground/60 select-none pointer-events-none z-10 leading-none'>
        +
      </span>

      {children}
    </div>
  );
}
