'use client';

import React, { useState, useEffect } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeftIcon, CheckIcon, UserCircleIcon, QrCodeIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        if (data) {
          setProfile(data);
          setDisplayName(data.display_name || '');
          setUpiId(data.upi_id || '');
        } else {
          // If profile row doesn't exist yet, populate default
          const defaultName = user.email?.split('@')[0] || 'User';
          setDisplayName(defaultName);
        }
      } catch (err) {
        console.error('Error in fetchProfile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const trimmedName = displayName.trim();
      const trimmedUpi = upiId.trim();

      if (!trimmedName) {
        throw new Error('Display name is required');
      }

      // Validate UPI ID format if provided
      if (trimmedUpi && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(trimmedUpi)) {
        throw new Error('Please enter a valid UPI ID (e.g., username@okhdfcbank or 9876543210@paytm)');
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            display_name: trimmedName,
            upi_id: trimmedUpi || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) {
        if (error.message.includes('unique constraint') || error.message.includes('profiles_upi_id_key')) {
          throw new Error('This UPI ID is already associated with another account');
        }
        throw error;
      }

      if (data) {
        setProfile(data);
      }
      setMessage({ type: 'success', text: 'Profile and UPI ID saved successfully! 🎉' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-white">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin"></div>
          <p className="mt-4 text-neo-xl font-neo-black text-neo-cyan">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neo-white pb-32 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <Link
            href="/"
            className="neo-icon-btn w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
            aria-label="Back to Home"
          >
            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black">
            MY PROFILE
          </h1>
        </div>

        {/* Profile Card */}
        <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-neo bg-neo-cyan border-3 border-neo-black flex items-center justify-center font-neo-black text-2xl text-neo-black">
              {displayName.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-neo-black text-lg sm:text-xl text-neo-black">
                {displayName || 'User'}
              </p>
              <p className="text-xs sm:text-neo-xs font-neo-bold text-neo-black opacity-70">
                {upiId ? `UPI: ${upiId}` : 'No UPI ID saved'}
              </p>
            </div>
          </div>
          <p className="text-xs font-neo-bold text-neo-black opacity-80 border-t-2 border-neo-black pt-3">
            💡 Setting your UPI ID enables friends to settle debts directly with you via QR code & UPI app links!
          </p>
        </div>

        {/* Form Card */}
        <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-4 sm:p-6">
          <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
            {message && (
              <div
                className={`p-3 sm:p-4 rounded-neo text-xs sm:text-neo-sm font-neo-bold border-2 sm:border-3 border-neo-black ${
                  message.type === 'success'
                    ? 'bg-neo-lime text-neo-black'
                    : 'bg-neo-magenta text-neo-white'
                }`}
              >
                {message.type === 'success' ? '✅' : '⚠️'} {message.text}
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-neo-sm font-neo-black text-neo-black mb-2 uppercase">
                Display Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="neo-input border-2 sm:border-3 text-xs sm:text-neo-md px-3 sm:px-4 py-2 sm:py-3 w-full bg-neo-white text-neo-black"
                  required
                />
              </div>
              <p className="text-xs font-neo-bold text-neo-black opacity-60 mt-1">
                This name will be shown to your trip members
              </p>
            </div>

            <div>
              <label className="block text-xs sm:text-neo-sm font-neo-black text-neo-black mb-2 uppercase flex items-center justify-between">
                <span>UPI ID (VPA)</span>
                <span className="text-neo-magenta text-xs font-neo-black">RECOMMENDED</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. name@okhdfcbank or 9876543210@paytm"
                  className="neo-input border-2 sm:border-3 text-xs sm:text-neo-md px-3 sm:px-4 py-2 sm:py-3 w-full bg-neo-white text-neo-black font-mono"
                />
              </div>
              <p className="text-xs font-neo-bold text-neo-black opacity-60 mt-1">
                Used in settlement QR codes (Google Pay, PhonePe, Paytm, BHIM)
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="neo-button-primary w-full border-2 sm:border-3 text-xs sm:text-neo-sm px-4 sm:px-6 py-3 sm:py-4 font-neo-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6"
            >
              {saving ? '⏳ Saving...' : '💾 SAVE UPI & PROFILE'}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
