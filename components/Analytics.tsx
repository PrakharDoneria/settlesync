'use client';

import React, { useEffect, useState } from 'react';
import { supabase, type Expense } from '@/lib/supabase';

interface AnalyticsProps {
  roomId: string;
  roomName: string;
}

interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  color: string;
}

export const Analytics: React.FC<AnalyticsProps> = ({ roomId, roomName }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>(
    []
  );

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const { data } = await supabase
          .from('expenses')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false });

        if (data) {
          setExpenses(data);
          calculateBreakdown(data);
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [roomId]);

  const calculateBreakdown = (expenseList: Expense[]) => {
    const categoryTotals: { [key: string]: number } = {};

    expenseList.forEach((expense) => {
      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    const colors: { [key: string]: string } = {
      Food: '#ff006e',
      Travel: '#9d00ff',
      Hotel: '#ff1493',
      Shopping: '#00d9ff',
      Other: '#ffed00',
    };

    const breakdown: CategoryBreakdown[] = Object.entries(categoryTotals).map(
      ([category, amount]) => ({
        category,
        total: amount,
        percentage: Math.round((amount / total) * 100),
        color: colors[category] || '#ffed00',
      })
    );

    setCategoryBreakdown(breakdown.sort((a, b) => b.total - a.total));
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const averageExpense = expenses.length > 0 ? totalSpent / expenses.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin"></div>
          <p className="mt-4 text-neo-md font-neo-black text-neo-cyan">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 bg-neo-white">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-black text-neo-black mb-2">ANALYTICS</h1>
        <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black opacity-70">
          {new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Total Spent Card */}
      <div className="neo-card-lg bg-neo-cyan border-3 sm:border-4 border-neo-black p-4 sm:p-6">
        <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black mb-2 uppercase">Total Spent</p>
        <p className="text-3xl sm:text-4xl md:text-5xl font-neo-black text-neo-black">
          ₹{totalSpent.toLocaleString('en-IN')}
        </p>
        <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black mt-2 opacity-80">
          {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="neo-card-lg bg-neo-magenta border-3 sm:border-4 border-neo-black p-3 sm:p-4">
          <p className="text-xs sm:text-neo-xs font-neo-bold text-neo-white mb-2 uppercase">Avg Expense</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-neo-black text-neo-white">
            ₹{averageExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-3 sm:p-4">
          <p className="text-xs sm:text-neo-xs font-neo-bold text-neo-black mb-2 uppercase">Total Count</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-neo-black text-neo-black">{expenses.length}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="neo-card-lg bg-neo-lime border-3 sm:border-4 border-neo-black p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl md:text-2xl font-neo-black text-neo-black mb-4">BREAKDOWN BY CATEGORY</h3>
          <div className="space-y-3 sm:space-y-4">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-neo-sm font-neo-bold text-neo-black">{cat.category.toUpperCase()}</span>
                  <div className="text-right">
                    <p className="text-xs sm:text-neo-sm font-neo-black text-neo-black">
                      ₹{cat.total.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs font-neo-bold text-neo-black opacity-70">{cat.percentage}%</p>
                  </div>
                </div>
                <div className="w-full bg-neo-black rounded-neo h-2 sm:h-3 overflow-hidden border border-neo-black">
                  <div
                    className="h-full rounded-neo transition-all duration-300"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      {expenses.length > 0 && (
        <div className="neo-card-lg bg-neo-white border-3 sm:border-4 border-neo-black p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl md:text-2xl font-neo-black text-neo-black mb-4">RECENT EXPENSES</h3>
          <div className="space-y-2 sm:space-y-3">
            {expenses.slice(0, 5).map((expense) => (
              <div
                key={expense.id}
                className="flex justify-between items-center py-2 sm:py-3 border-b-2 sm:border-b-3 border-neo-black last:border-b-0 px-2"
              >
                <div>
                  <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black">{expense.title}</p>
                  <p className="text-xs font-neo-bold text-neo-black opacity-60">{expense.category}</p>
                </div>
                <p className="text-xs sm:text-neo-sm font-neo-black text-neo-black">
                  ₹{expense.amount.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {expenses.length === 0 && (
        <div className="neo-card-lg bg-neo-yellow border-3 sm:border-4 border-neo-black p-6 sm:p-8 text-center">
          <p className="text-neo-md font-neo-black text-neo-black">No expenses yet 📊</p>
        </div>
      )}
    </div>
  );
};
