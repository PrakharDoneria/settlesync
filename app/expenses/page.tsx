'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { ExpenseForm } from '@/components/ExpenseForm';
import { supabase, type Expense, type Profile, type Room, type ExpenseSplit } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeftIcon,
  PlusIcon,
  UserGroupIcon,
  UserIcon,
  SparklesIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface ExpenseWithSplits extends Expense {
  splits?: ExpenseSplit[];
}

function ExpensesContent() {
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const { selectedRoomId: storedRoomId, setSelectedRoomId: setStoredRoomId } = useAppStore();
  const [selectedRoomId, setSelectedRoomId] = useState(storedRoomId || '');
  const [members, setMembers] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Fetch user & rooms list
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

        setCurrentUserId(user.id);

        // Get user's room IDs (joined + created)
        const { data: memberRows } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', user.id);

        const memberRoomIds = (memberRows || []).map((r) => r.room_id);

        let query = supabase.from('rooms').select('*');
        if (memberRoomIds.length > 0) {
          query = query.or(`created_by.eq.${user.id},id.in.(${memberRoomIds.join(',')})`);
        } else {
          query = query.eq('created_by', user.id);
        }

        const { data: roomsList } = await query.order('created_at', { ascending: false });

        if (roomsList && roomsList.length > 0) {
          setRooms(roomsList);

          // Check if URL has ?code= parameter
          const codeParam = searchParams.get('code');
          let matchedRoom: Room | undefined;

          if (codeParam) {
            matchedRoom = roomsList.find(
              (r) => r.invite_code?.toUpperCase() === codeParam.toUpperCase().trim()
            );
          }

          // Fallback to storedRoomId or first room
          if (!matchedRoom && storedRoomId) {
            matchedRoom = roomsList.find((r) => r.id === storedRoomId);
          }

          const activeRoom = matchedRoom || roomsList[0];

          setSelectedRoomId(activeRoom.id);
          setStoredRoomId(activeRoom.id);
          useAppStore.getState().setCurrentRoom(activeRoom);

          // Sync URL with room code if not already matching
          if (activeRoom.invite_code && codeParam !== activeRoom.invite_code) {
            router.replace(`/expenses?code=${activeRoom.invite_code}`);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, searchParams, storedRoomId, setStoredRoomId]);

  // Handle switching rooms in dropdown
  const handleRoomSelect = (newRoomId: string) => {
    setSelectedRoomId(newRoomId);
    setStoredRoomId(newRoomId);
    const chosenRoom = rooms.find((r) => r.id === newRoomId);
    if (chosenRoom) {
      useAppStore.getState().setCurrentRoom(chosenRoom);
      if (chosenRoom.invite_code) {
        router.replace(`/expenses?code=${chosenRoom.invite_code}`);
      }
    }
  };

  // 2. Fetch expenses and room members whenever selectedRoomId changes
  useEffect(() => {
    const fetchExpensesAndMembers = async () => {
      if (!selectedRoomId) return;

      try {
        // Fetch expenses
        const { data: expensesData, error: expError } = await supabase
          .from('expenses')
          .select('*')
          .eq('room_id', selectedRoomId)
          .order('created_at', { ascending: false });

        if (expError) throw expError;

        // Fetch splits for all expenses in this room
        let expensesWithSplits: ExpenseWithSplits[] = expensesData || [];
        if (expensesData && expensesData.length > 0) {
          const expenseIds = expensesData.map((e) => e.id);
          const { data: splitsData } = await supabase
            .from('expense_splits')
            .select('*')
            .in('expense_id', expenseIds);

          if (splitsData) {
            expensesWithSplits = expensesData.map((exp) => ({
              ...exp,
              splits: splitsData.filter((s) => s.expense_id === exp.id),
            }));
          }
        }

        setExpenses(expensesWithSplits);

        // Fetch room members
        const { data: membersData } = await supabase
          .from('room_members')
          .select('user_id, profiles(*)')
          .eq('room_id', selectedRoomId);

        let parsedMembers: Profile[] = [];
        if (membersData && membersData.length > 0) {
          parsedMembers = membersData.map((m: any) => m.profiles).filter(Boolean);
        }

        // Include room creator if missing
        const currentRoom = rooms.find((r) => r.id === selectedRoomId);
        if (currentRoom && !parsedMembers.some((m) => m.id === currentRoom.created_by)) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentRoom.created_by)
            .single();

          if (creatorProfile) {
            parsedMembers.unshift(creatorProfile);
          }
        }

        setMembers(parsedMembers);
      } catch (error) {
        console.error('Error fetching expenses or members:', error);
      }
    };

    fetchExpensesAndMembers();
  }, [selectedRoomId, rooms]);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Food: 'bg-orange-400',
      Travel: 'bg-purple-400',
      Hotel: 'bg-pink-400',
      Shopping: 'bg-teal-400',
      Other: 'bg-gray-400',
    };
    return colors[category] || 'bg-gray-400';
  };

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.id === userId);
    return member?.display_name || 'Unknown';
  };

  const activeRoom = rooms.find((r) => r.id === selectedRoomId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neo-white">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin"></div>
          <p className="mt-4 text-neo-lg font-neo-black text-neo-cyan">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neo-white pb-24 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="neo-icon-btn w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
              aria-label="Back to Home"
            >
              <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black">
                EXPENSES
              </h1>
              {activeRoom && (
                <p className="text-xs sm:text-neo-xs font-neo-bold text-neo-black opacity-70">
                  Trip Code: <span className="font-mono font-neo-black text-neo-black">{activeRoom.invite_code}</span>
                </p>
              )}
            </div>
          </div>

          {activeRoom && (
            <Link
              href={`/rooms/${activeRoom.id}`}
              className="neo-button-secondary border-2 px-3 py-1.5 text-xs font-neo-black uppercase hidden sm:inline-block"
            >
              Trip Details →
            </Link>
          )}
        </div>

        {/* Room Selector and Add Expense */}
        <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
          {rooms.length > 0 ? (
            <div>
              <label className="block text-xs sm:text-neo-sm font-neo-black text-neo-black mb-2 uppercase opacity-80">
                Select Trip
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => handleRoomSelect(e.target.value)}
                className="neo-input border-2 sm:border-3 w-full text-xs sm:text-neo-md px-3 sm:px-4 py-2 sm:py-3 bg-neo-white text-neo-black font-neo-bold"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.invite_code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-4 text-center">
              <p className="text-sm sm:text-base font-neo-black mb-2">No trips found!</p>
              <Link href="/rooms/create" className="neo-button-primary border-2 px-4 py-2 text-xs inline-block">
                Create a Trip
              </Link>
            </div>
          )}

          {/* Add Expense Button */}
          {rooms.length > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="neo-button-primary w-full border-2 sm:border-3 text-xs sm:text-neo-sm px-4 sm:px-6 py-3 sm:py-4 font-neo-black uppercase tracking-wide flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Add Expense</span>
            </button>
          )}
        </div>

        {/* Expenses List */}
        <div className="space-y-3 sm:space-y-4">
          {expenses.length === 0 ? (
            <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-6 sm:p-8 text-center">
              <p className="text-lg sm:text-2xl font-neo-black text-neo-black mb-2">
                No Expenses Yet 💰
              </p>
              <p className="text-xs sm:text-neo-md font-neo-bold text-neo-black opacity-70">
                Start tracking expenses for this trip
              </p>
            </div>
          ) : (
            expenses.map((expense) => {
              const isPayerCurrentUser = expense.paid_by === currentUserId;
              const splits = expense.splits || [];
              const splitCount = splits.length > 0 ? splits.length : (expense.split_all ? members.length : 1);
              const perPersonAmount = splitCount > 0 ? expense.amount / splitCount : expense.amount;
              const currentUserSplit = splits.find((s) => s.user_id === currentUserId);
              const isCurrentUserInvolved = expense.split_all || splits.some((s) => s.user_id === currentUserId);
              const isPersonalPayment = !expense.split_all && splits.length === 1 && splits[0].user_id === expense.paid_by;

              return (
                <div
                  key={expense.id}
                  className="neo-card-lg bg-neo-white border-2 sm:border-3 border-neo-black p-4 sm:p-5 hover:shadow-neo-lg transition-all"
                >
                  {/* Top Row: Title, Amount, Category */}
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-base sm:text-lg font-neo-black text-neo-black break-words">
                          {expense.title}
                        </h3>
                        <span className={`${getCategoryColor(expense.category)} text-neo-white text-xs font-neo-bold px-2 py-0.5 rounded-neo border border-neo-black`}>
                          {expense.category}
                        </span>
                      </div>
                      
                      {expense.description && (
                        <p className="text-xs font-neo-bold text-neo-black opacity-70 mb-2">
                          {expense.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xl sm:text-2xl font-neo-black text-neo-black">
                        ₹{expense.amount.toFixed(2)}
                      </p>
                      <p className="text-xs font-neo-bold text-neo-black opacity-60 uppercase">Total</p>
                    </div>
                  </div>

                  {/* Middle Row: Payer & Breakdown Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t-2 border-neo-black/20 text-xs font-neo-bold">
                    {/* Paid by badge */}
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-neo border border-neo-black ${
                      isPayerCurrentUser ? 'bg-neo-lime text-neo-black' : 'bg-neo-gray text-neo-black'
                    }`}>
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>
                        Paid by <strong>{isPayerCurrentUser ? 'You' : getMemberName(expense.paid_by)}</strong>
                      </span>
                    </div>

                    {/* Split Type Badge */}
                    {isPersonalPayment ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-neo border border-neo-black bg-neo-magenta text-neo-white">
                        <span>👤 Personal Payment (100% by payer)</span>
                      </div>
                    ) : expense.split_all ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-neo border border-neo-black bg-neo-cyan text-neo-black">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        <span>Split among ALL ({splitCount} members) · ₹{perPersonAmount.toFixed(2)}/each</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-neo border border-neo-black bg-neo-yellow text-neo-black">
                        <UserGroupIcon className="w-3.5 h-3.5" />
                        <span>Split between {splitCount} {splitCount === 1 ? 'member' : 'members'} · ₹{perPersonAmount.toFixed(2)}/each</span>
                      </div>
                    )}

                    {/* Date */}
                    {expense.expense_date && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 text-neo-black opacity-60 ml-auto">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        <span>{expense.expense_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: User's individual share summary */}
                  <div className="mt-3 pt-2 border-t border-dashed border-neo-black/30 flex items-center justify-between text-xs font-neo-bold">
                    <span className="opacity-70">Your Share:</span>
                    {isPayerCurrentUser && isPersonalPayment ? (
                      <span className="text-neo-black font-neo-black">Paid full ₹{expense.amount.toFixed(2)} (Personal)</span>
                    ) : isPayerCurrentUser ? (
                      <span className="text-emerald-700 font-neo-black">
                        You paid ₹{expense.amount.toFixed(2)} (Lent ₹{(expense.amount - (isCurrentUserInvolved ? perPersonAmount : 0)).toFixed(2)})
                      </span>
                    ) : isCurrentUserInvolved ? (
                      <span className="text-neo-magenta font-neo-black">
                        You owe ₹{(currentUserSplit?.amount || perPersonAmount).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-neo-black opacity-60">Not involved in this split</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Expense Form Modal */}
      {showForm && selectedRoomId && (
        <ExpenseForm
          roomId={selectedRoomId}
          members={members}
          onSuccess={() => {
            setShowForm(false);
            window.location.reload();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <BottomNav />
    </main>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-neo-white">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin"></div>
            <p className="mt-4 text-neo-lg font-neo-black text-neo-cyan">Loading...</p>
          </div>
        </div>
      }
    >
      <ExpensesContent />
    </Suspense>
  );
}
