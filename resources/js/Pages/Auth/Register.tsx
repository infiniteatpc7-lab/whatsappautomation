import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid';
import {
  IconEye,
  IconEyeOff,
  IconLoader2
} from '@tabler/icons-react';
import { toast } from 'sonner';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Please enter your name');
      return;
    }
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Account created successfully');
      router.visit('/dashboard/overview');
    }, 600);
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    setTimeout(() => {
      setOauthLoading(null);
      toast.success(`Account connected via ${provider === 'google' ? 'Google' : 'GitHub'}`);
      router.visit('/dashboard/overview');
    }, 600);
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
        Login
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
              &ldquo;This starter template has saved me countless hours of work and helped me
              deliver projects to my clients faster than ever before.&rdquo;
            </p>
            <footer className='text-sidebar-foreground/70 text-sm font-medium'>
              Random Dude
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Column: Authentication Form Container */}
      <div className='flex h-full w-full items-center justify-center p-6 lg:p-12'>
        <div className='flex w-full max-w-sm flex-col justify-center space-y-6'>
          {/* Header */}
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Create an account
            </h1>
            <p className='text-xs text-muted-foreground'>
              Enter your email below to create your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2 text-left'>
              <Label htmlFor='register-name' className='text-xs font-medium text-foreground/90'>
                Full Name
              </Label>
              <Input
                id='register-name'
                type='text'
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='John Doe'
                disabled={isLoading}
                className='h-10 rounded-md bg-background border-border/80 text-sm focus:border-foreground/60'
              />
            </div>

            <div className='space-y-2 text-left'>
              <Label htmlFor='register-email' className='text-xs font-medium text-foreground/90'>
                Email
              </Label>
              <Input
                id='register-email'
                type='email'
                autoComplete='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='Enter your email...'
                disabled={isLoading}
                className='h-10 rounded-md bg-background border-border/80 text-sm focus:border-foreground/60'
              />
            </div>

            <div className='space-y-2 text-left'>
              <Label htmlFor='register-password' className='text-xs font-medium text-foreground/90'>
                Password
              </Label>
              <div className='relative flex items-center'>
                <Input
                  id='register-password'
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='new-password'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='Create a secure password...'
                  disabled={isLoading}
                  className='h-10 pr-10 rounded-md bg-background border-border/80 text-sm focus:border-foreground/60'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-2.5 p-1 rounded text-muted-foreground hover:text-foreground transition-colors'
                >
                  {showPassword ? <IconEyeOff className='size-4' /> : <IconEye className='size-4' />}
                </button>
              </div>
              <p className='text-[11px] text-muted-foreground/70'>
                Must be at least 6 characters.
              </p>
            </div>

            <button
              type='submit'
              disabled={isLoading || oauthLoading !== null}
              className='h-10 w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2'
            >
              {isLoading && <IconLoader2 className='size-4 animate-spin' />}
              <span>Create Account</span>
            </button>
          </form>

          {/* Divider */}
          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t border-border/60' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background text-muted-foreground px-2 text-[11px] font-medium tracking-wider'>
                Or continue with
              </span>
            </div>
          </div>

          {/* Social OAuth Buttons */}
          <div className='space-y-2.5'>
            <button
              type='button'
              onClick={() => handleOAuth('github')}
              disabled={oauthLoading !== null || isLoading}
              className='h-10 w-full rounded-md border border-border/80 bg-background hover:bg-accent text-xs font-medium text-foreground flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50'
            >
              {oauthLoading === 'github' ? (
                <IconLoader2 className='size-4 animate-spin text-muted-foreground' />
              ) : (
                <svg className='size-4 fill-current' viewBox='0 0 24 24'>
                  <path d='M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z' />
                </svg>
              )}
              <span>Continue with Github</span>
            </button>

            <button
              type='button'
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading !== null || isLoading}
              className='h-10 w-full rounded-md border border-border/80 bg-background hover:bg-accent text-xs font-medium text-foreground flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50'
            >
              {oauthLoading === 'google' ? (
                <IconLoader2 className='size-4 animate-spin text-muted-foreground' />
              ) : (
                <svg className='size-4' viewBox='0 0 24 24'>
                  <path
                    fill='#4285F4'
                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  />
                  <path
                    fill='#34A853'
                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  />
                  <path
                    fill='#FBBC05'
                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z'
                  />
                  <path
                    fill='#EA4335'
                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z'
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Terms Footer */}
          <p className='px-6 text-center text-xs text-muted-foreground leading-relaxed'>
            By clicking continue, you agree to our{' '}
            <a href='#terms' className='underline underline-offset-4 hover:text-primary'>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href='#privacy' className='underline underline-offset-4 hover:text-primary'>
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

