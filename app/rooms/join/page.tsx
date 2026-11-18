'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { BottomNav } from '@/components/BottomNav';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function JoinRoomPage() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
      }
    };
    checkUser();
  }, [router]);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const code = inviteCode.toUpperCase().trim();

      if (!code) throw new Error('Please enter an invite code');

      // Find room by invite code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('invite_code', code)
        .single();

      if (roomError || !room) throw new Error('Invalid invite code');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        throw new Error('You are already a member of this trip');
      }

      // Add as member
      const { error: joinError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
        });

      if (joinError) throw joinError;

      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neo-white pb-32 px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="neo-icon-btn w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
            aria-label="Back to Home"
          >
            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black">
            JOIN TRIP
          </h1>
        </div>

        {/* Form Card */}
        <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-4 sm:p-6">
          <form onSubmit={handleJoinRoom} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="bg-neo-magenta border-2 sm:border-3 border-neo-black text-neo-white p-3 sm:p-4 rounded-neo text-xs sm:text-neo-sm font-neo-bold">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="neo-label text-xs sm:text-neo-sm">Invite Code *</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="E.g., ABC123"
                maxLength={6}
                className="neo-input border-2 sm:border-3 text-lg sm:text-2xl px-3 sm:px-4 py-3 sm:py-4 w-full bg-neo-white text-neo-black font-mono tracking-widest text-center"
                required
              />
              <p className="text-xs font-neo-bold text-neo-black opacity-60 mt-2">
                Ask the trip organizer for the code
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !inviteCode}
              className="neo-button-primary w-full border-2 sm:border-3 text-xs sm:text-neo-sm px-4 sm:px-6 py-3 sm:py-4 font-neo-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6"
            >
              {loading ? '⏳ Joining...' : '✨ JOIN TRIP'}
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="text-center text-neo-black text-xs sm:text-neo-xs font-neo-bold opacity-70 mt-4 sm:mt-6">
          You'll be added as a member once you join
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
