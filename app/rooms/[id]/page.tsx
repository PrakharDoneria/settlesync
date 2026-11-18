'use client';

import React, { useEffect, useState } from 'react';
import { supabase, type Room, type Profile } from '@/lib/supabase';
import { ArrowLeftIcon, DocumentDuplicateIcon, CheckIcon, ChatBubbleLeftRightIcon, ReceiptRefundIcon, ChartBarIcon, WalletIcon, UserGroupIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoomChat } from '@/components/RoomChat';
import { Analytics } from '@/components/Analytics';
import { SettlementQR } from '@/components/SettlementQR';
import { BottomNav } from '@/components/BottomNav';

interface RoomPageProps {
  params: {
    id: string;
  };
}

type Tab = 'overview' | 'expenses' | 'chat' | 'analytics' | 'settle' | 'members';

export default function RoomPage({ params }: RoomPageProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const router = useRouter();

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/auth');
          return;
        }

        // Get current user profile
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        setCurrentUser(userProfile);

        // Get room
        const { data: roomData } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', params.id)
          .single();

        setRoom(roomData);

        // Get members
        const { data: membersData } = await supabase
          .from('room_members')
          .select('user_id, profiles(*)')
          .eq('room_id', params.id);

        let parsedMembers: Profile[] = [];
        if (membersData && membersData.length > 0) {
          parsedMembers = membersData
            .map((m: any) => m.profiles)
            .filter(Boolean);
        }

        // If creator is not in member list yet, include creator profile
        if (roomData && !parsedMembers.some((m) => m.id === roomData.created_by)) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', roomData.created_by)
            .single();

          if (creatorProfile) {
            parsedMembers.unshift(creatorProfile);
          }
        }

        setMembers(parsedMembers);
      } catch (error) {
        console.error('Error fetching room data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [params.id, router]);

  const handleCopyCode = () => {
    if (room?.invite_code) {
      navigator.clipboard.writeText(room.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'overview', label: 'Overview', icon: UserGroupIcon },
    { id: 'expenses', label: 'Expenses', icon: ReceiptRefundIcon },
    { id: 'chat', label: 'Chat', icon: ChatBubbleLeftRightIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'settle', label: 'Settle', icon: WalletIcon },
    { id: 'members', label: 'Members', icon: UserGroupIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-white">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin"></div>
          <p className="mt-4 text-neo-xl font-neo-black text-neo-cyan">Loading...</p>
        </div>
      </div>
    );
  }

  if (!room || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-white">
        <div className="text-center">
          <p className="text-neo-lg font-neo-black text-neo-magenta">Trip not found</p>
          <Link href="/trips" className="neo-button-primary inline-block mt-4 border-2 px-4 py-2 text-sm">
            Back to Trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neo-white pb-24 px-0 sm:px-0 py-0">
      {/* Header */}
      <div className="bg-neo-lime border-b-3 sm:border-b-4 border-neo-black px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/trips"
              className="neo-icon-btn w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
              aria-label="Back to Trips"
            >
              <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
            </Link>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black break-words flex-1">
              {room.name.toUpperCase()}
            </h1>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-neo-white border-2 sm:border-3 border-neo-black rounded-neo p-2 sm:p-3">
              <p className="text-xs font-neo-bold text-neo-black opacity-70 uppercase">Members</p>
              <p className="text-lg sm:text-xl font-neo-black text-neo-black">{members.length}</p>
            </div>
            <div className="bg-neo-white border-2 sm:border-3 border-neo-black rounded-neo p-2 sm:p-3">
              <p className="text-xs font-neo-bold text-neo-black opacity-70 uppercase">Total</p>
              <p className="text-lg sm:text-xl font-neo-black text-neo-black">₹{room.total_spent.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-neo-white border-2 sm:border-3 border-neo-black rounded-neo p-2 sm:p-3 col-span-2 sm:col-span-1">
              <p className="text-xs font-neo-bold text-neo-black opacity-70 uppercase">Code</p>
              <div className="flex items-center gap-2">
                <p className="font-mono font-neo-black text-neo-black">{room.invite_code}</p>
                <button
                  onClick={handleCopyCode}
                  className="neo-icon-btn w-8 h-8 flex-shrink-0"
                  title="Copy Code"
                  aria-label="Copy Code"
                >
                  {copied ? (
                    <CheckIcon className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <DocumentDuplicateIcon className="w-4 h-4 text-neo-black" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-neo-white border-b-2 sm:border-b-3 border-neo-black overflow-x-auto sticky top-20 sm:top-24 z-20">
        <div className="max-w-6xl mx-auto flex gap-1 px-2 sm:px-4 md:px-6 lg:px-8 py-2 min-w-min">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 border-2 sm:border-3 rounded-neo font-neo-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-neo-cyan text-neo-black border-neo-black'
                    : 'bg-neo-gray text-neo-black border-neo-black hover:bg-neo-yellow'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {room.description && (
              <div className="neo-card-lg bg-neo-cyan border-3 sm:border-4 border-neo-black p-4 sm:p-6">
                <p className="text-xs sm:text-neo-xs font-neo-bold text-neo-black mb-2 uppercase opacity-70">Description</p>
                <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black">{room.description}</p>
              </div>
            )}

            <div className="neo-card-lg bg-neo-magenta border-3 sm:border-4 border-neo-black p-4 sm:p-6">
              <p className="text-xs sm:text-neo-xs font-neo-bold text-neo-white mb-3 uppercase opacity-90">Invite Code</p>
              <div className="flex items-center gap-3">
                <p className="text-2xl sm:text-4xl font-neo-black text-neo-white font-mono tracking-widest">{room.invite_code}</p>
                <button
                  onClick={handleCopyCode}
                  className="neo-icon-btn w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
                  aria-label="Copy Invite Code"
                >
                  {copied ? (
                    <CheckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  ) : (
                    <DocumentDuplicateIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                  )}
                </button>
              </div>
              <p className="text-xs font-neo-bold text-neo-white mt-3 opacity-80">Share with friends to invite them</p>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="text-center py-8">
            <p className="text-neo-xl font-neo-black text-neo-black mb-4">
              💰 Expense Management
            </p>
            <p className="text-neo-md font-neo-bold text-neo-black opacity-70 mb-6">
              Navigate to the Expenses page to log and view expenses for this trip
            </p>
            <Link
              href="/expenses"
              className="neo-button-primary inline-block border-2 sm:border-3 px-6 py-3 text-sm font-neo-black"
            >
              Go to Expenses
            </Link>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && currentUser && (
          <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-0 rounded-neo overflow-hidden" style={{ height: '500px' }}>
            <RoomChat roomId={params.id} currentUser={currentUser} />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <Analytics roomId={params.id} roomName={room.name} />
        )}

        {/* Settle Tab */}
        {activeTab === 'settle' && (
          <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-4 sm:p-6 rounded-neo">
            <SettlementQR balances={[]} roomName={room.name} />
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-4 sm:p-6">
            <h3 className="text-sm sm:text-neo-md font-neo-black text-neo-black mb-4 uppercase">
              Members ({members.length})
            </h3>

            <div className="space-y-2 sm:space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 sm:p-4 bg-neo-white border-2 sm:border-3 border-neo-black rounded-neo"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-neo bg-neo-magenta border-2 sm:border-3 border-neo-black flex items-center justify-center flex-shrink-0">
                    <span className="font-neo-black text-neo-white text-sm sm:text-base">
                      {member.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black break-words">
                      {member.display_name}
                    </p>
                    {member.upi_id && (
                      <p className="text-xs font-neo-bold text-neo-black opacity-60">{member.upi_id}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
