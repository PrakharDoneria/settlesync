'use client';

import React, { useState, useEffect } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  SquaresPlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';

export interface ExpenseItemDraft {
  id: string;
  title: string;
  description: string;
  amount: string;
  category: string;
  paid_by: string;
  splitType: 'all' | 'custom';
  selectedMembers: string[];
}

interface ExpenseFormProps {
  roomId: string;
  members: Profile[];
  onSuccess: () => void;
  onCancel: () => void;
}

const categories = ['Food', 'Travel', 'Hotel', 'Shopping', 'Other'];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  roomId,
  members,
  onSuccess,
  onCancel,
}) => {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [expensesList, setExpensesList] = useState<ExpenseItemDraft[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize draft expense
  const createNewDraft = (defaultPaidBy: string): ExpenseItemDraft => ({
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: '',
    description: '',
    amount: '',
    category: 'Food',
    paid_by: defaultPaidBy,
    splitType: 'all',
    selectedMembers: members.map((m) => m.id),
  });

  useEffect(() => {
    const initUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user ? user.id : members[0]?.id || '';
      setCurrentUserId(uid);
      setExpensesList([createNewDraft(uid)]);
    };
    initUser();
  }, [members]);

  const currentExpense = expensesList[activeIndex] || expensesList[0];

  const updateCurrentExpense = (fields: Partial<ExpenseItemDraft>) => {
    setExpensesList((prev) => {
      const updated = [...prev];
      if (updated[activeIndex]) {
        updated[activeIndex] = { ...updated[activeIndex], ...fields };
      }
      return updated;
    });
  };

  const handleToggleMember = (memberId: string) => {
    if (!currentExpense) return;
    const currentList = currentExpense.selectedMembers || [];
    const updated = currentList.includes(memberId)
      ? currentList.filter((id) => id !== memberId)
      : [...currentList, memberId];

    // If all members are checked, switch to all or keep custom
    updateCurrentExpense({
      selectedMembers: updated,
      splitType: 'custom',
    });
  };

  const handleSelectAll = () => {
    updateCurrentExpense({
      splitType: 'all',
      selectedMembers: members.map((m) => m.id),
    });
  };

  const handleSelectCustom = () => {
    updateCurrentExpense({
      splitType: 'custom',
    });
  };

  const handleAddAnotherExpense = () => {
    // Basic validation on current
    if (!currentExpense.title.trim()) {
      setError('Please provide a title for the current expense first');
      return;
    }
    if (!currentExpense.amount || parseFloat(currentExpense.amount) <= 0) {
      setError('Please enter a valid amount for the current expense');
      return;
    }

    setError('');
    const newDraft = createNewDraft(currentExpense.paid_by || currentUserId);
    setExpensesList((prev) => [...prev, newDraft]);
    setActiveIndex(expensesList.length);
  };

  const handleRemoveExpense = (indexToRemove: number) => {
    if (expensesList.length === 1) {
      // Just reset the single draft
      setExpensesList([createNewDraft(currentUserId)]);
      setActiveIndex(0);
      return;
    }

    setExpensesList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (activeIndex >= indexToRemove) {
      setActiveIndex(Math.max(0, activeIndex - 1));
    }
  };

  const totalBatchAmount = expensesList.reduce((acc, item) => {
    const val = parseFloat(item.amount);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate all items
      for (let i = 0; i < expensesList.length; i++) {
        const item = expensesList[i];
        if (!item.title.trim()) {
          setActiveIndex(i);
          throw new Error(`Expense #${i + 1} is missing a title`);
        }
        const amt = parseFloat(item.amount);
        if (isNaN(amt) || amt <= 0) {
          setActiveIndex(i);
          throw new Error(`Expense #${i + 1} has an invalid amount`);
        }
        if (!item.paid_by) {
          setActiveIndex(i);
          throw new Error(`Please specify who paid for Expense #${i + 1}`);
        }
        if (item.splitType === 'custom' && item.selectedMembers.length === 0) {
          setActiveIndex(i);
          throw new Error(`Please select at least 1 member to split Expense #${i + 1}`);
        }
      }

      // Insert all expenses and splits sequentially or in batch
      for (const item of expensesList) {
        const amt = parseFloat(item.amount);
        const splitWith =
          item.splitType === 'all'
            ? members.map((m) => m.id)
            : item.selectedMembers;

        // Insert expense
        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            room_id: roomId,
            paid_by: item.paid_by,
            title: item.title.trim(),
            description: item.description?.trim() || null,
            amount: amt,
            category: item.category,
            expense_date: new Date().toISOString().split('T')[0],
            split_all: item.splitType === 'all',
          })
          .select()
          .single();

        if (expenseError) throw expenseError;

        // Insert splits
        const splitAmt = amt / splitWith.length;
        const splitsPayload = splitWith.map((uid) => ({
          expense_id: expense.id,
          user_id: uid,
          amount: splitAmt,
        }));

        const { error: splitsError } = await supabase
          .from('expense_splits')
          .insert(splitsPayload);

        if (splitsError) throw splitsError;
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving expenses');
    } finally {
      setLoading(false);
    }
  };

  if (!currentExpense) return null;

  return (
    <div className="fixed inset-0 bg-neo-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-4 sm:p-6 md:p-8 w-full max-w-2xl my-auto transition-all shadow-neo-xl">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b-3 border-neo-black">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-neo-black text-neo-black">
                ADD EXPENSES
              </h2>
              <span className="neo-badge bg-neo-cyan text-neo-black">
                {expensesList.length} {expensesList.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs sm:text-neo-xs font-neo-bold text-neo-black opacity-70 mt-0.5">
              Total batch sum: ₹{totalBatchAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="neo-icon-btn w-9 h-9 sm:w-11 sm:h-11 flex-shrink-0"
            aria-label="Close dialog"
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
          </button>
        </div>

        {/* Batch Items Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-thin">
          {expensesList.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveIndex(idx);
                setError('');
              }}
              className={`flex items-center gap-2 px-3 py-2 border-2 sm:border-3 rounded-neo font-neo-black text-xs whitespace-nowrap transition-all ${
                activeIndex === idx
                  ? 'bg-neo-yellow text-neo-black border-neo-black shadow-neo'
                  : 'bg-neo-gray text-neo-black border-neo-black hover:bg-neo-white'
              }`}
            >
              <span>
                #{idx + 1} {item.title ? item.title.slice(0, 12) : 'Untitled'}
              </span>
              {item.amount && (
                <span className="text-xs bg-neo-black text-neo-white px-1.5 py-0.5 rounded">
                  ₹{item.amount}
                </span>
              )}
              {expensesList.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveExpense(idx);
                  }}
                  className="hover:text-neo-magenta font-black ml-1 text-sm leading-none"
                  title="Remove this expense"
                >
                  ×
                </span>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={handleAddAnotherExpense}
            className="flex items-center gap-1 px-3 py-2 border-2 sm:border-3 border-dashed border-neo-black rounded-neo font-neo-black text-xs whitespace-nowrap bg-neo-lime hover:bg-emerald-300 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>+ Add More</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-neo-magenta border-2 sm:border-3 border-neo-black text-neo-white p-3 rounded-neo text-xs sm:text-neo-sm font-neo-bold mb-4 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button
              onClick={() => setError('')}
              className="text-neo-white font-black hover:opacity-80 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form Body - Comfortable Spacious Layout */}
        <form onSubmit={handleSubmitAll} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-neo-black uppercase text-neo-black mb-1">
                Expense Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Dinner at Cafe Chill, Airport Taxi"
                value={currentExpense.title}
                onChange={(e) => updateCurrentExpense({ title: e.target.value })}
                className="neo-input text-sm sm:text-base px-3 sm:px-4 py-2.5 sm:py-3 w-full bg-neo-white border-2 sm:border-3"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-neo-black uppercase text-neo-black mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                value={currentExpense.amount}
                onChange={(e) => updateCurrentExpense({ amount: e.target.value })}
                className="neo-input text-sm sm:text-base font-mono px-3 sm:px-4 py-2.5 sm:py-3 w-full bg-neo-white border-2 sm:border-3"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-neo-black uppercase text-neo-black mb-1">
                Category
              </label>
              <select
                value={currentExpense.category}
                onChange={(e) => updateCurrentExpense({ category: e.target.value })}
                className="neo-input text-sm sm:text-base px-3 sm:px-4 py-2.5 sm:py-3 w-full bg-neo-white border-2 sm:border-3"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Paid By */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-neo-black uppercase text-neo-black mb-1">
                Who Paid? *
              </label>
              <select
                value={currentExpense.paid_by}
                onChange={(e) => updateCurrentExpense({ paid_by: e.target.value })}
                className="neo-input text-sm sm:text-base px-3 sm:px-4 py-2.5 sm:py-3 w-full bg-neo-white border-2 sm:border-3"
                required
              >
                <option value="">Select payer</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name} {member.id === currentUserId ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Among Section */}
          <div className="border-2 sm:border-3 border-neo-black rounded-neo p-3 sm:p-4 bg-neo-gray">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <label className="block text-xs font-neo-black uppercase text-neo-black">
                Split Among:
              </label>

              {/* Mode Toggle: "ALL" vs "CUSTOM" */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`px-3 py-1.5 rounded-neo border-2 border-neo-black font-neo-black text-xs transition-all ${
                    currentExpense.splitType === 'all'
                      ? 'bg-neo-cyan text-neo-black shadow-neo'
                      : 'bg-neo-white text-neo-black hover:bg-neo-yellow'
                  }`}
                >
                  ✨ ALL (Dynamically divided as members join)
                </button>
                <button
                  type="button"
                  onClick={handleSelectCustom}
                  className={`px-3 py-1.5 rounded-neo border-2 border-neo-black font-neo-black text-xs transition-all ${
                    currentExpense.splitType === 'custom'
                      ? 'bg-neo-magenta text-neo-white shadow-neo'
                      : 'bg-neo-white text-neo-black hover:bg-neo-yellow'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* If Split is ALL */}
            {currentExpense.splitType === 'all' ? (
              <div className="p-3 bg-neo-white border-2 border-neo-black rounded-neo text-xs sm:text-neo-xs font-neo-bold text-neo-black flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-neo-cyan flex-shrink-0" />
                <span>
                  Split equally among all <strong>{members.length}</strong> current trip members. New members joining this trip will automatically be included in this split!
                </span>
              </div>
            ) : (
              /* Custom Member Checkboxes */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {members.map((member) => {
                  const isChecked = currentExpense.selectedMembers.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      onClick={() => handleToggleMember(member.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-neo border-2 border-neo-black cursor-pointer transition-colors select-none ${
                        isChecked ? 'bg-neo-yellow' : 'bg-neo-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 border-2 border-neo-black accent-neo-black cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-neo-bold text-neo-black truncate">
                        {member.display_name} {member.id === currentUserId ? '(You)' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 border-t-2 sm:border-t-3 border-neo-black">
            <button
              type="button"
              onClick={handleAddAnotherExpense}
              className="neo-button-secondary border-2 sm:border-3 text-xs sm:text-sm py-2.5 sm:py-3 px-3 sm:px-4 font-neo-black uppercase flex items-center justify-center gap-1.5"
            >
              <SquaresPlusIcon className="w-4 h-4" />
              <span>Add Another Expense</span>
            </button>

            <div className="flex flex-1 gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 neo-button-secondary border-2 sm:border-3 text-xs sm:text-sm py-2.5 sm:py-3 px-3 font-neo-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 neo-button-primary border-2 sm:border-3 text-xs sm:text-sm py-2.5 sm:py-3 px-3 font-neo-black uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? '⏳ Saving...'
                  : expensesList.length > 1
                  ? `✨ PUSH ALL (${expensesList.length})`
                  : '✨ SAVE EXPENSE'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
