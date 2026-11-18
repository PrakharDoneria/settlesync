'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { BottomNav } from '@/components/BottomNav';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.push('/');
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate password strength
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
            },
          },
        });

        if (signUpError) {
          // Provide user-friendly error messages
          if (signUpError.message.includes('already registered')) {
            throw new Error('This email is already registered. Please sign in instead.');
          }
          if (signUpError.message.includes('database')) {
            throw new Error('Server error. Please try again in a moment. If this persists, contact support.');
          }
          throw signUpError;
        }

        if (data.user) {
          // Attempt to update profile with display name (may fail silently during signup flow)
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              display_name: displayName || email.split('@')[0],
            })
            .eq('id', data.user.id);

          // Log but don't throw - profile should be auto-created by trigger
          if (profileError) {
            console.warn('Profile update warning:', profileError);
          }
        }

        setError('');
        setEmail('');
        setPassword('');
        setDisplayName('');
        setIsSignUp(false);
        alert(
          'Signup successful! Please check your email to verify your account. After verification, you can sign in.'
        );
      } else {
        // Sign in
        if (!email || !password) {
          throw new Error('Please enter both email and password');
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please try again.');
          }
          if (signInError.message.includes('Email not confirmed')) {
            throw new Error('Please verify your email first. Check your inbox for the confirmation link.');
          }
          throw signInError;
        }

        router.push('/');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neo-white flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 sm:w-16 h-12 sm:h-16 bg-neo-cyan border-3 sm:border-4 border-neo-black rounded-neo mb-3 sm:mb-4">
            <ArrowLeftIcon className="w-6 sm:w-8 h-6 sm:h-8 text-neo-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black mb-1 sm:mb-2">
            SETTLE<span className="text-neo-magenta">SYNC</span>
          </h1>
          <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black">Zero-friction expense sharing</p>
        </div>

        {/* Form Card */}
        <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-4 sm:p-6 mb-4">
          <form onSubmit={handleAuth} className="space-y-3 sm:space-y-4">
            {error && (
              <div className="bg-neo-magenta border-2 sm:border-3 border-neo-black text-neo-white p-3 sm:p-4 rounded-neo text-xs sm:text-neo-sm font-neo-bold">
                ⚠️ {error}
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-xs sm:text-neo-sm font-neo-black text-neo-black mb-2 uppercase">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="neo-input border-2 sm:border-3 text-xs sm:text-neo-md px-3 sm:px-4 py-2 sm:py-3 w-full"
                />
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-neo-sm font-neo-black text-neo-black mb-2 uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="neo-input border-2 sm:border-3 text-xs sm:text-neo-md px-3 sm:px-4 py-2 sm:py-3 w-full"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-neo-sm font-neo-black text-neo-black mb-2 uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="neo-input border-2 sm:border-3 text-xs sm:text-neo-md px-3 sm:px-4 py-2 sm:py-3 w-full"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-button-primary w-full border-2 sm:border-3 text-xs sm:text-neo-sm px-4 sm:px-6 py-3 sm:py-4 font-neo-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center border-t-2 sm:border-t-3 border-neo-black pt-4 sm:pt-6">
            <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black mb-2 sm:mb-3">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="neo-button-secondary border-2 sm:border-3 text-xs sm:text-neo-sm px-4 sm:px-6 py-2 sm:py-3 font-neo-black uppercase"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>

        {/* Info */}
        <p className="text-center text-neo-black text-xs sm:text-neo-xs font-neo-bold opacity-70">
          By signing up, you agree to our Terms of Service
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
