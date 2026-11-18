'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { BottomNav } from '@/components/BottomNav';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateRoomPage() {
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Create room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          created_by: user.id,
          name: roomName,
          description: description || null,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as member if not already added
      const { error: memberError } = await supabase
        .from('room_members')
        .upsert(
          {
            room_id: room.id,
            user_id: user.id,
          },
          { onConflict: 'room_id,user_id' }
        );

      if (memberError) {
        console.warn('Member addition warning:', memberError);
      }

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
            CREATE TRIP
          </h1>
        </div>

        {/* Form Card */}
        <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-4 sm:p-6">
          <form onSubmit={handleCreateRoom} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="bg-neo-magenta border-2 sm:border-3 border-neo-black text-neo-white p-3 sm:p-4 rounded-neo text-xs sm:text-neo-sm font-neo-bold">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="neo-label text-xs sm:text-neo-sm">Trip Name *</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Bali Trip 2026"
                className="neo-input border-2 sm:border-3 text-xs sm:text-neo-md px-3 sm:px-4 py-2 sm:py-3 w-full bg-neo-white text-neo-black"
                required
              />
            </div>

            <div>
              <label className="neo-label text-xs sm:text-neo-sm">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: Trip details, dates, locations, etc."
                className="neo-input border-2 sm:border-3 text-xs sm:text-neo-md px-3 sm:px-4 py-2 sm:py-3 w-full bg-neo-white text-neo-black resize-none h-24 sm:h-32"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !roomName}
              className="neo-button-primary w-full border-2 sm:border-3 text-xs sm:text-neo-sm px-4 sm:px-6 py-3 sm:py-4 font-neo-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6"
            >
              {loading ? '⏳ Creating...' : '✨ CREATE TRIP'}
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="text-center text-neo-black text-xs sm:text-neo-xs font-neo-bold opacity-70 mt-4 sm:mt-6">
          Trip will be created with you as the organizer
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
