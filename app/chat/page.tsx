'use client';

import React, { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { RoomChat } from '@/components/RoomChat';
import { supabase, type Profile, type Room } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const { selectedRoomId: storedRoomId, setSelectedRoomId: setStoredRoomId } = useAppStore();
  const [selectedRoomId, setSelectedRoomId] = useState(storedRoomId || '');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/auth');
          return;
        }

        // Get current user profile
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        setCurrentUser(userData);

        // Get user's rooms (joined + created)
        const { data: memberRows } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', authUser.id);

        const memberRoomIds = (memberRows || []).map((r) => r.room_id);

        let query = supabase.from('rooms').select('*');
        if (memberRoomIds.length > 0) {
          query = query.or(`created_by.eq.${authUser.id},id.in.(${memberRoomIds.join(',')})`);
        } else {
          query = query.eq('created_by', authUser.id);
        }

        const { data: roomsList } = await query.order('created_at', { ascending: false });

        if (roomsList && roomsList.length > 0) {
          setRooms(roomsList);
          
          const activeRoomId = (storedRoomId && roomsList.some((r) => r.id === storedRoomId))
            ? storedRoomId
            : roomsList[0].id;

          setSelectedRoomId(activeRoomId);
          setStoredRoomId(activeRoomId);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, storedRoomId, setStoredRoomId]);

  const handleRoomSelect = (newRoomId: string) => {
    setSelectedRoomId(newRoomId);
    setStoredRoomId(newRoomId);
    const chosenRoom = rooms.find((r) => r.id === newRoomId);
    if (chosenRoom) {
      useAppStore.getState().setCurrentRoom(chosenRoom);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-neo-white">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin"></div>
          <p className="mt-4 text-neo-lg font-neo-black text-neo-cyan">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neo-white pb-24 flex flex-col px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8 border-b-2 sm:border-b-3 border-neo-black pb-4 sm:pb-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Link
            href="/"
            className="neo-icon-btn w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
            aria-label="Back to Home"
          >
            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black">CHAT</h1>
        </div>

        {/* Room Selector */}
        {rooms.length > 0 && (
          <div>
            <label className="block text-xs sm:text-neo-sm font-neo-bold text-neo-black mb-2 uppercase opacity-70">
              Select Trip
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => handleRoomSelect(e.target.value)}
              className="neo-input border-2 sm:border-3 w-full text-xs sm:text-neo-md px-3 sm:px-4 py-2 sm:py-3 bg-neo-white text-neo-black"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden max-w-4xl mx-auto w-full">
        {selectedRoomId && (
          <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-0 rounded-neo overflow-hidden" style={{ height: '500px' }}>
            <RoomChat roomId={selectedRoomId} currentUser={currentUser} />
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
