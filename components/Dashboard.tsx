'use client';

import React, { useEffect, useState } from 'react';
import { PlusIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { supabase, type Room, type Profile } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

export const Dashboard: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setLoading(false);
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Create default profile if it doesn't exist
          const defaultName = authUser.email?.split('@')[0] || 'User';
          setUser({
            id: authUser.id,
            display_name: defaultName,
            upi_id: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } else if (profileData) {
          // Ensure display_name is not null/undefined
          setUser({
            ...profileData,
            display_name: profileData.display_name || authUser.email?.split('@')[0] || 'User',
          });
        }

        const { data: memberRows } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', authUser.id);

        const memberRoomIds = (memberRows || []).map((r) => r.room_id);

        let roomsQuery = supabase.from('rooms').select('*');
        if (memberRoomIds.length > 0) {
          roomsQuery = roomsQuery.or(`created_by.eq.${authUser.id},id.in.(${memberRoomIds.join(',')})`);
        } else {
          roomsQuery = roomsQuery.eq('created_by', authUser.id);
        }

        const { data: roomDetails } = await roomsQuery.order('created_at', { ascending: false });
        setRooms(roomDetails || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin"></div>
          <p className="mt-4 text-neo-xl font-neo-black text-neo-cyan">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 px-3 sm:px-4 md:px-6 lg:px-8 bg-neo-white min-h-screen">
      {/* Header */}
      <div className="pt-4 sm:pt-6 pb-4 sm:pb-6">
        <div className="flex justify-between items-start gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-neo-black text-neo-black mb-1 sm:mb-2 break-words">
              SETTLE<span className="text-neo-cyan">SYNC</span>
            </h1>
            <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black">
              {isAuthenticated ? `Hey ${user?.display_name?.split(' ')[0]}! 🔥` : 'Welcome to SettleSync! 👋'}
            </p>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="neo-button-secondary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap"
                title="Manage UPI & Profile"
              >
                <span>{user?.upi_id ? '💳 UPI Set' : '⚠️ Add UPI'}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="neo-button-danger flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                Exit
              </button>
            </div>
          )}
        </div>

        {/* Balance Card */}
        <div className="neo-card-lg bg-neo-lime border-3 sm:border-4 border-neo-black mb-4 sm:mb-6 p-4 sm:p-6">
          <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black mb-1 sm:mb-2 uppercase">Account Balance</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black">₹{(rooms.reduce((sum, r) => sum + r.total_spent, 0) || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black mt-2 sm:mt-3">across all trips</p>
          <div className="mt-3 sm:mt-4 h-2 bg-neo-black rounded-neo"></div>
        </div>
      </div>

      {/* Trips Section */}
      <div className="mb-8 sm:mb-12">
        <div className="flex justify-between items-center mb-4 sm:mb-6 gap-2">
          <h2 className="text-lg sm:text-xl md:text-2xl font-neo-black text-neo-black">YOUR TRIPS</h2>
          {isAuthenticated && (
            <Link
              href="/rooms/create"
              className="neo-button-primary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 border-2 sm:border-3"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">NEW</span>
            </Link>
          )}
        </div>

        {!isAuthenticated ? (
          <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-4 sm:p-8 text-center">
            <p className="text-lg sm:text-2xl font-neo-black text-neo-black mb-3 sm:mb-4">
              LOGIN TO GET STARTED 📱
            </p>
            <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black mb-4 sm:mb-6">
              Sign in to create and manage your expense groups
            </p>
            <Link
              href="/auth"
              className="neo-button-primary inline-block text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-3 border-2 sm:border-3"
            >
              Login
            </Link>
          </div>
        ) : rooms.length === 0 ? (
          <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-4 sm:p-8 text-center">
            <p className="text-lg sm:text-2xl font-neo-black text-neo-black mb-3 sm:mb-4">
              NO TRIPS YET 📭
            </p>
            <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black mb-4 sm:mb-6">
              Create one to get started!
            </p>
            <Link
              href="/rooms/create"
              className="neo-button-primary inline-block text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-3 border-2 sm:border-3"
            >
              Create First Trip
            </Link>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {rooms.map((room, idx) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                onClick={() => {
                  useAppStore.getState().setSelectedRoomId(room.id);
                  useAppStore.getState().setCurrentRoom(room);
                }}
                className={`neo-card-lg p-3 sm:p-5 border-3 sm:border-4 block hover:shadow-neo-xl transition-all ${
                  idx % 3 === 0
                    ? 'bg-neo-cyan'
                    : idx % 3 === 1
                      ? 'bg-neo-magenta'
                      : 'bg-neo-yellow'
                }`}
              >
                <div className="flex justify-between items-start gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-lg font-neo-black text-neo-black mb-1 truncate">
                      {room.name.toUpperCase()}
                    </h3>
                    <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black break-all">
                      CODE: <span className="text-neo-blue">{room.invite_code}</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg sm:text-xl font-neo-black text-neo-black">
                      ₹{room.total_spent.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs font-neo-bold text-neo-black">TOTAL</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {isAuthenticated && (
        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl md:text-2xl font-neo-black text-neo-black mb-3 sm:mb-4">QUICK ACTIONS</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <Link
              href="/rooms/join"
              className="neo-button-primary w-full text-center py-3 sm:py-4 text-xs sm:text-sm font-neo-bold border-2 sm:border-3"
            >
              JOIN TRIP
            </Link>
            <Link
              href="/expenses"
              className="neo-button-success w-full text-center py-3 sm:py-4 text-xs sm:text-sm font-neo-bold border-2 sm:border-3"
            >
              LOG EXPENSE
            </Link>
            <Link
              href="/profile"
              className="neo-button-warning w-full text-center py-3 sm:py-4 text-xs sm:text-sm font-neo-bold border-2 sm:border-3 col-span-2 sm:col-span-1"
            >
              MANAGE UPI ID
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
