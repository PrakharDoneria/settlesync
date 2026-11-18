'use client';

import React, { useEffect, useState } from 'react';
import { PlusIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { supabase, type Room } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { useAppStore } from '@/lib/store';

export default function MyTripsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth');
          return;
        }

        // Fetch rooms where user is member OR user is creator
        const { data: memberRows } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', user.id);

        const memberRoomIds = (memberRows || []).map((r) => r.room_id);

        // Fetch rooms where user is member or creator
        let query = supabase.from('rooms').select('*');
        if (memberRoomIds.length > 0) {
          query = query.or(`created_by.eq.${user.id},id.in.(${memberRoomIds.join(',')})`);
        } else {
          query = query.eq('created_by', user.id);
        }

        const { data: roomsList, error: roomsError } = await query.order('created_at', { ascending: false });

        if (roomsError) throw roomsError;
        setRooms(roomsList || []);
      } catch (error) {
        console.error('Error fetching trips:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-white">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin"></div>
          <p className="mt-4 text-neo-xl font-neo-black text-neo-cyan">Loading trips...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neo-white pb-32 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-neo-black text-neo-black mb-2">
            MY TRIPS
          </h1>
          <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black opacity-70">
            {rooms.length} trip{rooms.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Create/Join Actions */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Link
            href="/rooms/create"
            className="neo-button-primary flex items-center justify-center gap-2 border-2 sm:border-3 text-xs sm:text-neo-sm px-3 sm:px-6 py-3 sm:py-4 font-neo-black uppercase"
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Create</span>
          </Link>
          <Link
            href="/rooms/join"
            className="neo-button-success flex items-center justify-center gap-2 border-2 sm:border-3 text-xs sm:text-neo-sm px-3 sm:px-6 py-3 sm:py-4 font-neo-black uppercase"
          >
            <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Join</span>
          </Link>
        </div>

        {/* Trips List */}
        {rooms.length === 0 ? (
          <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-6 sm:p-8 text-center">
            <p className="text-lg sm:text-2xl font-neo-black text-neo-black mb-3">
              No Trips Yet 🗺️
            </p>
            <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black mb-6">
              Create a new trip or join one with an invite code
            </p>
            <div className="flex gap-2 justify-center">
              <Link
                href="/rooms/create"
                className="neo-button-primary border-2 sm:border-3 text-xs sm:text-neo-sm px-4 sm:px-6 py-2 sm:py-3 font-neo-black"
              >
                Create Trip
              </Link>
              <Link
                href="/rooms/join"
                className="neo-button-secondary border-2 sm:border-3 text-xs sm:text-neo-sm px-4 sm:px-6 py-2 sm:py-3 font-neo-black"
              >
                Join Trip
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {rooms.map((room, idx) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                onClick={() => {
                  useAppStore.getState().setSelectedRoomId(room.id);
                  useAppStore.getState().setCurrentRoom(room);
                }}
                className={`neo-card-lg p-4 sm:p-6 border-3 sm:border-4 border-neo-black hover:shadow-neo-xl transition-all group ${
                  idx % 3 === 0
                    ? 'bg-neo-cyan'
                    : idx % 3 === 1
                      ? 'bg-neo-magenta'
                      : 'bg-neo-yellow'
                }`}
              >
                <div className="flex justify-between items-start gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm sm:text-lg font-neo-black mb-1 truncate ${
                      idx % 3 === 1 ? 'text-neo-white' : 'text-neo-black'
                    }`}>
                      {room.name.toUpperCase()}
                    </h3>
                    <p className={`text-xs sm:text-neo-xs font-neo-bold ${
                      idx % 3 === 1 ? 'text-neo-white' : 'text-neo-black'
                    } opacity-70`}>
                      Code: {room.invite_code}
                    </p>
                    {room.description && (
                      <p className={`text-xs font-neo-bold mt-2 line-clamp-2 ${
                        idx % 3 === 1 ? 'text-neo-white' : 'text-neo-black'
                      }`}>
                        {room.description}
                      </p>
                    )}
                  </div>
                  <div className={`text-right flex-shrink-0 ${
                    idx % 3 === 1 ? 'text-neo-white' : 'text-neo-black'
                  }`}>
                    <p className="text-lg sm:text-xl font-neo-black">
                      ₹{room.total_spent.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs font-neo-bold">SPENT</p>
                  </div>
                </div>
                
                {/* Arrow indicator */}
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t-2 sm:border-t-3 border-current opacity-50 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                    idx % 3 === 1 ? 'text-neo-white' : 'text-neo-black'
                  }`} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
