import React, { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator
} from '@/components/ui/input-otp';
import {
  IconEye,
  IconEyeOff,
  IconKey,
  IconLoader2,
  IconMailCheck
} from '@tabler/icons-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Request OTP Form
  const sendForm = useForm({
    email: ''
  });

  // Step 2: Reset Password with OTP Form
  const resetForm = useForm({
    email: '',
    code: '',
    password: '',
    password_confirmation: ''
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendForm.data.email) {
      toast.error('Please enter your email address');
      return;
    }

    sendForm.post('/password/otp/send', {
      onSuccess: () => {
        toast.success('If your email is registered, you will receive a verification code.');
        resetForm.setData('email', sendForm.data.email);
        setStep(2);
      },
      onError: (errs) => {
        if (errs.email) {
          toast.error(errs.email);
        }
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetForm.data.code.length !== 6) {
      toast.error('Please enter the full 6-digit verification code');
      return;
    }

    resetForm.post('/password/otp/reset', {
      onError: (errs) => {
        if (errs.code) {
          toast.error(errs.code);
        } else if (errs.password) {
          toast.error(errs.password);
        }
      }
    });
  };

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background'>
      {/* Top right switch link */}
      <Link
        href='/login'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 md:top-8 md:right-8 z-30 font-medium text-sm'
        )}
      >
        Back to Login
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

        {/* Testimonial Quote */}
        <div className='text-sidebar-foreground relative z-20 mt-auto'>
          <blockquote className='space-y-2 max-w-lg'>
            <p className='text-lg leading-relaxed'>
              &ldquo;Resetting passwords with short-lived email OTP tokens ensures zero credential leaks
              and guarantees instant recovery without expiring links.&rdquo;
            </p>
            <footer className='text-sidebar-foreground/70 text-sm font-medium'>
              Account Security
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className='flex h-full w-full items-center justify-center p-6 lg:p-12'>
        <div className='flex w-full max-w-sm flex-col justify-center space-y-6'>
          {step === 1 ? (
            <>
              {/* Step 1: Request OTP */}
              <div className='flex flex-col items-center space-y-2 text-center'>
                <div className='flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-1'>
                  <IconKey className='size-6' />
                </div>
                <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                  Reset your password
                </h1>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  Enter your email address and we&apos;ll send you a 6-digit verification code to
                  reset your password.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className='space-y-4'>
                <div className='space-y-2 text-left'>
                  <Label htmlFor='reset-email' className='text-xs font-medium text-foreground/90'>
                    Email
                  </Label>
                  <Input
                    id='reset-email'
                    type='email'
                    autoComplete='email'
                    required
                    value={sendForm.data.email}
                    onChange={(e) => sendForm.setData('email', e.target.value)}
                    placeholder='Enter your email...'
                    disabled={sendForm.processing}
                    className='h-10 rounded-md bg-background border-border/80 text-sm focus:border-foreground/60'
                  />
                  {sendForm.errors.email && (
                    <p className='text-xs text-destructive'>{sendForm.errors.email}</p>
                  )}
                </div>

                <button
                  type='submit'
                  disabled={sendForm.processing}
                  className='h-10 w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2'
                >
                  {sendForm.processing && <IconLoader2 className='size-4 animate-spin' />}
                  <span>Send Verification Code</span>
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: Enter OTP & Set New Password */}
              <div className='flex flex-col items-center space-y-2 text-center'>
                <div className='flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-1'>
                  <IconMailCheck className='size-6' />
                </div>
                <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                  Set new password
                </h1>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  We sent a code to{' '}
                  <span className='font-semibold text-foreground'>{resetForm.data.email}</span>.{' '}
                  <button
                    type='button'
                    onClick={() => setStep(1)}
                    className='text-primary underline underline-offset-2 hover:text-foreground cursor-pointer font-medium'
                  >
                    Change
                  </button>
                </p>
              </div>

              <form onSubmit={handleResetPassword} className='space-y-4'>
                {/* 6-Digit OTP */}
                <div className='flex flex-col items-center space-y-1.5'>
                  <Label className='text-xs font-medium text-foreground/90 self-start'>
                    6-Digit Verification Code
                  </Label>
                  <InputOTP
                    maxLength={6}
                    value={resetForm.data.code}
                    onChange={(value) => resetForm.setData('code', value)}
                    disabled={resetForm.processing}
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
                  {resetForm.errors.code && (
                    <p className='text-xs text-destructive text-center'>{resetForm.errors.code}</p>
                  )}
                </div>

                {/* New Password */}
                <div className='space-y-1.5 text-left'>
                  <Label htmlFor='new-password' className='text-xs font-medium text-foreground/90'>
                    New Password
                  </Label>
                  <div className='relative flex items-center'>
                    <Input
                      id='new-password'
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      required
                      value={resetForm.data.password}
                      onChange={(e) => resetForm.setData('password', e.target.value)}
                      placeholder='At least 8 chars, mixed case, symbols...'
                      disabled={resetForm.processing}
                      className='h-9 pr-10 rounded-md bg-background border-border/80 text-sm focus:border-foreground/60'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-2.5 p-1 rounded text-muted-foreground hover:text-foreground transition-colors'
                    >
                      {showPassword ? <IconEyeOff className='size-4' /> : <IconEye className='size-4' />}
                    </button>
                  </div>
                  {resetForm.errors.password && (
                    <p className='text-xs text-destructive'>{resetForm.errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className='space-y-1.5 text-left'>
                  <Label htmlFor='new-password-confirm' className='text-xs font-medium text-foreground/90'>
                    Confirm New Password
                  </Label>
                  <div className='relative flex items-center'>
                    <Input
                      id='new-password-confirm'
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      required
                      value={resetForm.data.password_confirmation}
                      onChange={(e) => resetForm.setData('password_confirmation', e.target.value)}
                      placeholder='Repeat your new password...'
                      disabled={resetForm.processing}
                      className='h-9 pr-10 rounded-md bg-background border-border/80 text-sm focus:border-foreground/60'
                    />
                    <button
                      type='button'
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className='absolute right-2.5 p-1 rounded text-muted-foreground hover:text-foreground transition-colors'
                    >
                      {showConfirmPassword ? <IconEyeOff className='size-4' /> : <IconEye className='size-4' />}
                    </button>
                  </div>
                  {resetForm.errors.password_confirmation && (
                    <p className='text-xs text-destructive'>{resetForm.errors.password_confirmation}</p>
                  )}
                </div>

                <button
                  type='submit'
                  disabled={resetForm.data.code.length !== 6 || resetForm.processing}
                  className='h-10 w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2'
                >
                  {resetForm.processing && <IconLoader2 className='size-4 animate-spin' />}
                  <span>Reset Password</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
