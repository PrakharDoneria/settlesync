'use client';

import React, { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { SettlementQR } from '@/components/SettlementQR';
import { supabase, type Balance, type Room } from '@/lib/supabase';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettlePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedRoomName, setSelectedRoomName] = useState('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth');
          return;
        }

        // Get user's rooms
        const { data: roomsData } = await supabase
          .from('room_members')
          .select('room_id, rooms(*)')
          .eq('user_id', user.id);

        if (roomsData && roomsData.length > 0) {
          const roomsList = roomsData.map((r: any) => r.rooms as Room);
          setRooms(roomsList);
          setSelectedRoomId(roomsList[0].id);
          setSelectedRoomName(roomsList[0].name);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!selectedRoomId) return;

      try {
        const { data, error } = await supabase.rpc('calculate_room_balances', {
          room_id_param: selectedRoomId,
        });

        if (error) throw error;
        setBalances(data || []);
      } catch (error) {
        console.error('Error calculating balances:', error);
      }
    };

    fetchBalances();
  }, [selectedRoomId]);

  const handleRoomChange = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    setSelectedRoomId(roomId);
    setSelectedRoomName(room?.name || '');
  };

  if (loading) {
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
    <main className="min-h-screen bg-neo-white pb-24 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <Link
            href="/"
            className="neo-icon-btn w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
            aria-label="Back to Home"
          >
            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black">SETTLE UP</h1>
        </div>

        {/* Room Selector */}
        {rooms.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <label className="block text-xs sm:text-neo-sm font-neo-bold text-neo-black mb-2 uppercase opacity-70">
              Select Trip
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => handleRoomChange(e.target.value)}
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

        {/* Settlement Content */}
        {balances.length > 0 ? (
          <SettlementQR balances={balances} roomName={selectedRoomName} />
        ) : (
          <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-6 sm:p-8 text-center">
            <p className="text-lg sm:text-2xl font-neo-black text-neo-black mb-2">
              No Transactions Yet 🧾
            </p>
            <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black opacity-70">
              Start adding expenses to settle up with your trip members
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
