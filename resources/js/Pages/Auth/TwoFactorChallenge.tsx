import React, { useState, useEffect } from 'react';
import { router, useForm, Link } from '@inertiajs/react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator
} from '@/components/ui/input-otp';
import { IconLoader2, IconShieldLock, IconArrowLeft } from '@tabler/icons-react';
import { toast } from 'sonner';

interface TwoFactorChallengeProps {
  email: string;
  cooldown?: number;
}

export default function TwoFactorChallenge({ email, cooldown: initialCooldown = 0 }: TwoFactorChallengeProps) {
  const [cooldown, setCooldown] = useState(initialCooldown);

  const { data, setData, post, processing, errors } = useForm({
    code: ''
  });

  useEffect(() => {
    setCooldown(initialCooldown);
  }, [initialCooldown]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.code.length !== 6) {
      toast.error('Please enter the full 6-digit verification code');
      return;
    }

    post('/two-factor-challenge', {
      onError: (errs) => {
        if (errs.code) {
          toast.error(errs.code);
        }
      }
    });
  };

  const handleResend = () => {
    if (cooldown > 0) return;

    router.post(
      '/two-factor-challenge/resend',
      {},
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success('A new two-factor code has been sent to your email.');
          setCooldown(60);
        },
        onError: (errs) => {
          if (errs.code) {
            toast.error(errs.code);
          }
        }
      }
    );
  };

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background'>
      {/* Top right switch link */}
      <Link
        href='/login'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 md:top-8 md:right-8 z-30 font-medium text-sm flex items-center gap-1.5'
        )}
      >
        <IconArrowLeft className='size-4' />
        Back to login
      </Link>

      {/* Left Column: Brand & Interactive Grid Pattern */}
      <div className='relative hidden h-full flex-col p-10 lg:flex dark:border-r border-border/40'>
        <div className='absolute inset-0 bg-sidebar' />
        <div className='text-sidebar-foreground relative z-20 flex items-center text-lg font-semibold tracking-tight'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mr-2.5 h-6 w-6 text-foreground'
          >
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg>
          shadcn.io
        </div>

        {/* Interactive hover grid pattern */}
        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(400px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[0%] h-full skew-y-12'
          )}
        />

        {/* Security badge and quote */}
        <div className='text-sidebar-foreground relative z-20 mt-auto'>
          <blockquote className='space-y-2 max-w-lg'>
            <p className='text-lg leading-relaxed'>
              &ldquo;Multi-factor authentication protects your business communications and
              ensures only authorized operators access your customer channels.&rdquo;
            </p>
            <footer className='text-sidebar-foreground/70 text-sm font-medium'>
              Enterprise Security Shield
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Column: OTP Challenge Container */}
      <div className='flex h-full w-full items-center justify-center p-6 lg:p-12'>
        <div className='flex w-full max-w-sm flex-col justify-center space-y-6 my-auto'>
          {/* Header & Icon */}
          <div className='flex flex-col space-y-2.5 text-center items-center'>
            <div className='flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-1'>
              <IconShieldLock className='size-6 text-primary' />
            </div>
            <h1 className='text-xl font-semibold tracking-tight text-foreground'>
              Two-Factor Authentication
            </h1>
            <p className='text-xs text-muted-foreground max-w-xs leading-relaxed'>
              Enter the 6-digit code sent to{' '}
              <span className='font-medium text-foreground'>{email}</span> to verify your identity.
            </p>
          </div>

          {/* OTP Input Form */}
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div className='flex flex-col items-center space-y-2'>
              <InputOTP
                maxLength={6}
                value={data.code}
                onChange={(value) => setData('code', value)}
                disabled={processing}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              {errors.code && (
                <p className='text-xs text-destructive text-center'>{errors.code}</p>
              )}
            </div>

            <button
              type='submit'
              disabled={data.code.length !== 6 || processing}
              className='h-10 w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2'
            >
              {processing && <IconLoader2 className='size-4 animate-spin' />}
              <span>Verify & Log In</span>
            </button>
          </form>

          {/* Resend actions */}
          <div className='flex flex-col items-center space-y-2 text-center pt-1'>
            <p className='text-xs text-muted-foreground'>
              Didn&apos;t receive a code?
            </p>
            <button
              type='button'
              disabled={cooldown > 0}
              onClick={handleResend}
              className='text-xs font-semibold text-primary hover:underline underline-offset-4 disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed transition-colors'
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
