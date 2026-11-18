'use client';

import React, { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { ExpenseForm } from '@/components/ExpenseForm';
import { supabase, type Expense, type Profile, type Room } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const { selectedRoomId: storedRoomId, setSelectedRoomId: setStoredRoomId } = useAppStore();
  const [selectedRoomId, setSelectedRoomId] = useState(storedRoomId || '');
  const [members, setMembers] = useState<Profile[]>([]);
  const [showForm, setShowForm] = useState(false);
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
          
          // If storedRoomId exists in user's rooms, use it, else default to first room
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

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!selectedRoomId) return;

      try {
        // Get expenses
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('*')
          .eq('room_id', selectedRoomId)
          .order('created_at', { ascending: false });

        setExpenses(expensesData || []);

        // Get room members
        const { data: membersData } = await supabase
          .from('room_members')
          .select('user_id, profiles(*)')
          .eq('room_id', selectedRoomId);

        if (membersData) {
          setMembers(membersData.map((m: any) => m.profiles));
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
      }
    };

    fetchExpenses();
  }, [selectedRoomId]);

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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black">EXPENSES</h1>
        </div>

        {/* Room Selector and Add Expense */}
        <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
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

          {/* Add Expense Button */}
          <button
            onClick={() => setShowForm(true)}
            className="neo-button-primary w-full border-2 sm:border-3 text-xs sm:text-neo-sm px-4 sm:px-6 py-3 sm:py-4 font-neo-black uppercase tracking-wide flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add Expense</span>
          </button>
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
            expenses.map((expense) => (
              <div
                key={expense.id}
                className="neo-card-lg bg-neo-white border-2 sm:border-3 border-neo-black p-3 sm:p-4 hover:shadow-neo-lg transition-shadow"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-neo-md font-neo-black text-neo-black mb-1">
                      {expense.title}
                    </h3>
                    <p className="text-xs sm:text-neo-xs font-neo-bold text-neo-black opacity-70 mb-2">
                      Paid by {getMemberName(expense.paid_by)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`${getCategoryColor(expense.category)} text-neo-white text-xs sm:text-neo-xs font-neo-bold px-2 sm:px-3 py-1 rounded-neo`}>
                        {expense.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg sm:text-xl font-neo-black text-neo-cyan">
                      ₹{expense.amount.toFixed(2)}
                    </p>
                    <p className="text-xs font-neo-bold text-neo-black opacity-70">PAID</p>
                  </div>
                </div>
              </div>
            ))
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
            // Refresh expenses
            window.location.reload();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <BottomNav />
    </main>
  );
}
