'use client';

import React, { useEffect, useState } from 'react';
import { supabase, type Room, type Profile } from '@/lib/supabase';
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ChatBubbleLeftRightIcon,
  ReceiptRefundIcon,
  ChartBarIcon,
  WalletIcon,
  UserGroupIcon,
  LinkIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoomChat } from '@/components/RoomChat';
import { Analytics } from '@/components/Analytics';
import { SettlementQR } from '@/components/SettlementQR';
import { BottomNav } from '@/components/BottomNav';
import { useAppStore } from '@/lib/store';

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Danger actions states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

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
        if (roomData) {
          useAppStore.getState().setSelectedRoomId(roomData.id);
          useAppStore.getState().setCurrentRoom(roomData);
        }

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

  const getInviteUrl = () => {
    if (typeof window !== 'undefined' && room?.invite_code) {
      return `${window.location.origin}/rooms/join?code=${room.invite_code}`;
    }
    return room?.invite_code ? `/rooms/join?code=${room.invite_code}` : '';
  };

  const handleCopyLink = () => {
    const url = getInviteUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Leave Trip
  const handleLeaveTrip = async () => {
    if (!currentUser || !room) return;
    setActionError('');
    setActionLoading(true);

    try {
      const { error: leaveErr } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', currentUser.id);

      if (leaveErr) throw leaveErr;

      // Clear selection if this room was stored
      if (useAppStore.getState().selectedRoomId === room.id) {
        useAppStore.getState().setSelectedRoomId(null);
        useAppStore.getState().setCurrentRoom(null);
      }

      router.push('/trips');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to leave trip');
      setActionLoading(false);
    }
  };

  // Delete Trip (creator only)
  const handleDeleteTrip = async () => {
    if (!currentUser || !room) return;
    if (room.created_by !== currentUser.id) {
      setActionError('Only the trip organizer can delete this trip');
      return;
    }

    setActionError('');
    setActionLoading(true);

    try {
      const { error: deleteErr } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id)
        .eq('created_by', currentUser.id);

      if (deleteErr) throw deleteErr;

      // Clear selection if this room was stored
      if (useAppStore.getState().selectedRoomId === room.id) {
        useAppStore.getState().setSelectedRoomId(null);
        useAppStore.getState().setCurrentRoom(null);
      }

      router.push('/trips');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete trip');
      setActionLoading(false);
    }
  };

  const isCreator = currentUser && room && room.created_by === currentUser.id;

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
    <main className="min-h-screen bg-neo-white pb-32 px-0 sm:px-0 py-0">
      {/* Header */}
      <div className="bg-neo-lime border-b-3 sm:border-b-4 border-neo-black px-3 sm:px-6 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Link
                href="/trips"
                className="neo-icon-btn w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
                aria-label="Back to Trips"
              >
                <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl md:text-4xl font-neo-black text-neo-black truncate">
                  {room.name.toUpperCase()}
                </h1>
                <p className="text-xs font-neo-bold opacity-80">
                  {isCreator ? '👑 Organizer' : '👤 Member'}
                </p>
              </div>
            </div>

            {/* Quick action buttons in header */}
            <div className="flex items-center gap-2">
              <Link
                href={`/expenses?code=${room.invite_code}`}
                className="neo-button-primary border-2 px-3 py-1.5 text-xs font-neo-black uppercase"
              >
                + Expense
              </Link>
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-neo-white border-2 sm:border-3 border-neo-black rounded-neo p-2.5 sm:p-3">
              <p className="text-xs font-neo-bold text-neo-black opacity-70 uppercase">Members</p>
              <p className="text-lg sm:text-xl font-neo-black text-neo-black">{members.length}</p>
            </div>
            <div className="bg-neo-white border-2 sm:border-3 border-neo-black rounded-neo p-2.5 sm:p-3">
              <p className="text-xs font-neo-bold text-neo-black opacity-70 uppercase">Total Spent</p>
              <p className="text-lg sm:text-xl font-neo-black text-neo-black truncate">
                ₹{room.total_spent.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-neo-white border-2 sm:border-3 border-neo-black rounded-neo p-2.5 sm:p-3 col-span-2 sm:col-span-1">
              <p className="text-xs font-neo-bold text-neo-black opacity-70 uppercase">Invite Code</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-neo-black text-neo-black tracking-widest">{room.invite_code}</p>
                <button
                  onClick={handleCopyCode}
                  className="neo-icon-btn w-7 h-7 flex-shrink-0"
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
      <div className="bg-neo-white border-b-2 sm:border-b-3 border-neo-black overflow-x-auto scrollbar-none">
        <div className="max-w-6xl mx-auto flex gap-1.5 px-3 sm:px-6 py-2.5 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-neo border-2 sm:border-3 font-neo-black text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-neo-cyan text-neo-black border-neo-black shadow-neo'
                    : 'bg-neo-gray text-neo-black border-neo-black hover:bg-neo-yellow'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Error Notification */}
        {actionError && (
          <div className="bg-neo-magenta border-3 border-neo-black text-neo-white p-3 sm:p-4 rounded-neo text-xs sm:text-sm font-neo-bold mb-4 flex items-center justify-between">
            <span>⚠️ {actionError}</span>
            <button onClick={() => setActionError('')} className="font-black ml-2">✕</button>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {room.description && (
              <div className="neo-card-lg bg-neo-cyan border-3 sm:border-4 border-neo-black p-4 sm:p-6">
                <p className="text-xs sm:text-neo-xs font-neo-bold text-neo-black mb-2 uppercase opacity-70">Description</p>
                <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black">{room.description}</p>
              </div>
            )}

            {/* Invitations Card */}
            <div className="neo-card-lg bg-neo-magenta border-3 sm:border-4 border-neo-black p-4 sm:p-6 text-neo-white">
              <p className="text-xs sm:text-neo-xs font-neo-bold uppercase opacity-90 mb-3">Trip Invitations</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* 6-Digit Code */}
                <div className="bg-neo-white border-2 sm:border-3 border-neo-black p-3 sm:p-4 rounded-neo text-neo-black">
                  <p className="text-xs font-neo-bold uppercase opacity-70 mb-1">Invite Code</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xl sm:text-2xl font-neo-black font-mono tracking-widest">{room.invite_code}</p>
                    <button
                      onClick={handleCopyCode}
                      className="neo-icon-btn w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0"
                      aria-label="Copy Invite Code"
                      title="Copy Code"
                    >
                      {copied ? (
                        <CheckIcon className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <DocumentDuplicateIcon className="w-5 h-5 text-neo-black" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-neo-bold opacity-60 mt-1.5">Enter code manually on Join Trip page</p>
                </div>

                {/* Auto-Join Link */}
                <div className="bg-neo-white border-2 sm:border-3 border-neo-black p-3 sm:p-4 rounded-neo text-neo-black">
                  <p className="text-xs font-neo-bold uppercase opacity-70 mb-1">Direct Auto-Join Link</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-neo-bold truncate font-mono opacity-80 select-all max-w-[170px] sm:max-w-none">
                      {getInviteUrl()}
                    </p>
                    <button
                      onClick={handleCopyLink}
                      className="neo-button-primary border-2 px-3 py-1.5 text-xs font-neo-black uppercase flex items-center gap-1.5 flex-shrink-0"
                      title="Copy Auto-Join Link"
                    >
                      {copiedLink ? (
                        <>
                          <CheckIcon className="w-4 h-4 text-emerald-800" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-4 h-4" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-neo-bold opacity-60 mt-1.5">Friends clicking this link will join automatically!</p>
                </div>
              </div>
            </div>

            {/* Trip Danger / Management Zone */}
            <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-neo-black uppercase text-neo-black mb-2 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-neo-magenta" />
                <span>Trip Actions</span>
              </h3>
              <p className="text-xs font-neo-bold text-neo-black opacity-70 mb-4">
                Manage your membership or remove the trip
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Leave Trip Option (Always available to non-creators or creators who want to leave membership) */}
                {!isCreator ? (
                  !confirmLeave ? (
                    <button
                      onClick={() => setConfirmLeave(true)}
                      className="neo-button-secondary border-2 sm:border-3 text-xs sm:text-sm px-4 py-3 font-neo-black uppercase flex items-center justify-center gap-2"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>Leave Trip</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-neo-bold text-neo-magenta">Leave this trip?</span>
                      <button
                        onClick={handleLeaveTrip}
                        disabled={actionLoading}
                        className="neo-button-danger border-2 px-3 py-2 text-xs font-neo-black uppercase"
                      >
                        {actionLoading ? 'Leaving...' : 'Yes, Leave'}
                      </button>
                      <button
                        onClick={() => setConfirmLeave(false)}
                        className="neo-button-secondary border-2 px-3 py-2 text-xs font-neo-black uppercase"
                      >
                        Cancel
                      </button>
                    </div>
                  )
                ) : (
                  /* Delete Trip Option (Organizer only) */
                  !confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="neo-button-danger border-2 sm:border-3 text-xs sm:text-sm px-4 py-3 font-neo-black uppercase flex items-center justify-center gap-2"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete Trip (Organizer Only)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap bg-neo-yellow border-2 border-neo-black p-3 rounded-neo">
                      <span className="text-xs font-neo-bold text-neo-black">
                        Are you sure? All expenses, splits, and messages will be permanently deleted!
                      </span>
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <button
                          onClick={handleDeleteTrip}
                          disabled={actionLoading}
                          className="neo-button-danger border-2 px-3 py-2 text-xs font-neo-black uppercase flex-1 sm:flex-none"
                        >
                          {actionLoading ? 'Deleting...' : 'Yes, Delete Trip'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="neo-button-secondary border-2 px-3 py-2 text-xs font-neo-black uppercase flex-1 sm:flex-none"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
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
              href={`/expenses?code=${room.invite_code}`}
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm sm:text-neo-md font-neo-black text-neo-black uppercase">
                Members ({members.length})
              </h3>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
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
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black break-words">
                        {member.display_name}
                      </p>
                      {member.id === room.created_by && (
                        <span className="bg-neo-lime text-neo-black border border-neo-black text-[10px] font-neo-black px-1.5 py-0.2 rounded">
                          ORGANIZER
                        </span>
                      )}
                      {member.id === currentUser?.id && (
                        <span className="bg-neo-cyan text-neo-black border border-neo-black text-[10px] font-neo-black px-1.5 py-0.2 rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    {member.upi_id && (
                      <p className="text-xs font-mono font-neo-bold text-neo-black opacity-60 truncate">
                        {member.upi_id}
                      </p>
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
