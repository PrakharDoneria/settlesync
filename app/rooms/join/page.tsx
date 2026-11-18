'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { BottomNav } from '@/components/BottomNav';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function JoinRoomContent() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoJoining, setAutoJoining] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const processJoin = useCallback(async (codeToJoin: string) => {
    const code = codeToJoin.toUpperCase().trim();
    if (!code) throw new Error('Please enter an invite code');

    // Find room by invite code (using maybeSingle to handle empty or invalid results gracefully)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();

    if (roomError) {
      console.error('Error finding room:', roomError);
      throw new Error('Failed to find trip with this invite code');
    }

    if (!room) {
      throw new Error('Invalid invite code. Please check with your trip organizer.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // If user isn't authenticated, save intended code and redirect to auth
      if (typeof window !== 'undefined') {
        localStorage.setItem('settlesync_pending_invite_code', code);
      }
      router.push(`/auth?redirect=/rooms/join?code=${code}`);
      return;
    }

    // Check if already a member or creator
    if (room.created_by === user.id) {
      useAppStore.getState().setSelectedRoomId(room.id);
      useAppStore.getState().setCurrentRoom(room);
      router.push(`/rooms/${room.id}`);
      return;
    }

    const { data: existingMember } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      useAppStore.getState().setSelectedRoomId(room.id);
      useAppStore.getState().setCurrentRoom(room);
      router.push(`/rooms/${room.id}`);
      return;
    }

    // Add as member
    const { error: joinError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
      });

    if (joinError) throw joinError;

    // Update global selected room store
    useAppStore.getState().setSelectedRoomId(room.id);
    useAppStore.getState().setCurrentRoom(room);

    router.push(`/rooms/${room.id}`);
  }, [router]);

  useEffect(() => {
    const initAndCheckAutoJoin = async () => {
      const codeParam = searchParams.get('code') || 
        (typeof window !== 'undefined' ? localStorage.getItem('settlesync_pending_invite_code') : null);

      if (codeParam) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('settlesync_pending_invite_code');
        }
        const cleaned = codeParam.toUpperCase().trim();
        setInviteCode(cleaned);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push(`/auth?redirect=/rooms/join?code=${cleaned}`);
          return;
        }

        setAutoJoining(true);
        setLoading(true);
        try {
          await processJoin(cleaned);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to join trip');
          setAutoJoining(false);
          setLoading(false);
        }
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth');
        }
      }
    };

    initAndCheckAutoJoin();
  }, [searchParams, router, processJoin]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await processJoin(inviteCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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

        {/* Auto-joining Banner */}
        {autoJoining && (
          <div className="neo-card-lg bg-neo-cyan border-3 sm:border-4 border-neo-black p-4 mb-6 text-center">
            <div className="inline-block w-8 h-8 border-3 border-neo-black border-t-neo-magenta rounded-full animate-neo-spin mb-2"></div>
            <p className="font-neo-black text-sm sm:text-base text-neo-black uppercase">
              Joining trip via invite link...
            </p>
          </div>
        )}

        {/* Form Card */}
        <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-4 sm:p-6">
          <form onSubmit={handleManualSubmit} className="space-y-4 sm:space-y-5">
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
                Ask the trip organizer for the code or an auto-join link
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

export default function JoinRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-neo-white">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin"></div>
            <p className="mt-4 text-neo-md font-neo-black text-neo-cyan">Loading...</p>
          </div>
        </div>
      }
    >
      <JoinRoomContent />
    </Suspense>
  );
}
