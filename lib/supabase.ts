import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export type Profile = {
  id: string;
  display_name: string;
  upi_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  invite_code: string;
  invite_link: string;
  total_spent: number;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  room_id: string;
  paid_by: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  created_at: string;
};

export type RoomMessage = {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

export type RoomMember = {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
};

export type Balance = {
  user_id: string;
  display_name: string;
  upi_id: string | null;
  balance: number;
};
