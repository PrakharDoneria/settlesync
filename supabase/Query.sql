-- ====================================================================
-- SettleSync Master Database Migration & Fix Script (Combined)
-- ====================================================================
-- Run this entire script in your Supabase SQL Editor.
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES SCHEMA
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  upi_id VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  invite_code VARCHAR(6) UNIQUE NOT NULL,
  invite_link VARCHAR(255),
  total_spent DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  paid_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  split_all BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure split_all column exists if table was created previously
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'split_all'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN split_all BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON public.rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON public.rooms(invite_code);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_room_id ON public.expenses(room_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON public.expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON public.room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON public.room_messages(created_at DESC);

-- BACKFILL EXISTING PROFILES
INSERT INTO public.profiles (id, display_name)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'User')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. HELPER FUNCTIONS TO AVOID RLS RECURSION
CREATE OR REPLACE FUNCTION public.get_user_room_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT room_id FROM public.room_members WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = p_user_id
  );
$$;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies to clear recursion issues
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of room members" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;

DROP POLICY IF EXISTS "Users can view rooms they created or joined" ON public.rooms;
DROP POLICY IF EXISTS "Users can find room by invite code" ON public.rooms;
DROP POLICY IF EXISTS "Users can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can update their rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete their rooms" ON public.rooms;

DROP POLICY IF EXISTS "Users can view members of their rooms" ON public.room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_members;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_members;

DROP POLICY IF EXISTS "Users can view expenses in their rooms" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses in their rooms" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their expenses" ON public.expenses;

DROP POLICY IF EXISTS "Users can view expense splits in their rooms" ON public.expense_splits;
DROP POLICY IF EXISTS "Users can create expense splits in their rooms" ON public.expense_splits;
DROP POLICY IF EXISTS "Users can update expense splits in their rooms" ON public.expense_splits;
DROP POLICY IF EXISTS "Users can delete expense splits in their rooms" ON public.expense_splits;

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.room_messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.room_messages;

-- PROFILES
CREATE POLICY "Profiles are readable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ROOMS
CREATE POLICY "Users can view rooms they created or joined" ON public.rooms
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (SELECT public.get_user_room_ids(auth.uid()))
  );

-- Allow authenticated users to look up a room by invite_code to join
CREATE POLICY "Users can find room by invite code" ON public.rooms
  FOR SELECT TO authenticated
  USING (invite_code IS NOT NULL);

CREATE POLICY "Users can insert rooms" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their rooms" ON public.rooms
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their rooms" ON public.rooms
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ROOM_MEMBERS
CREATE POLICY "Users can view members of their rooms" ON public.room_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    room_id IN (SELECT public.get_user_room_ids(auth.uid())) OR
    room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can join rooms" ON public.room_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can leave rooms" ON public.room_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- EXPENSES
CREATE POLICY "Users can view expenses in their rooms" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    public.is_room_member(room_id, auth.uid()) OR
    room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can create expenses in their rooms" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    paid_by = auth.uid() AND
    (
      public.is_room_member(room_id, auth.uid()) OR
      room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update their expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (paid_by = auth.uid())
  WITH CHECK (paid_by = auth.uid());

CREATE POLICY "Users can delete their expenses" ON public.expenses
  FOR DELETE TO authenticated
  USING (paid_by = auth.uid());

-- EXPENSE_SPLITS
CREATE POLICY "Users can view expense splits in their rooms" ON public.expense_splits
  FOR SELECT TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM public.expenses 
      WHERE public.is_room_member(room_id, auth.uid())
         OR room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
    )
  );

CREATE POLICY "Users can create expense splits in their rooms" ON public.expense_splits
  FOR INSERT TO authenticated
  WITH CHECK (
    expense_id IN (
      SELECT id FROM public.expenses WHERE paid_by = auth.uid()
    )
  );

-- ROOM_MESSAGES
CREATE POLICY "Users can view messages in their rooms" ON public.room_messages
  FOR SELECT TO authenticated
  USING (
    public.is_room_member(room_id, auth.uid()) OR
    room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can send messages to their rooms" ON public.room_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (
      public.is_room_member(room_id, auth.uid()) OR
      room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
    )
  );

-- 5. ROOM INVITE CODE GENERATOR TRIGGER
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
  counter INT := 0;
BEGIN
  LOOP
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Could not generate unique invite code after 100 attempts';
    END IF;
    
    new_code := SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::int + 1, 1) ||
                SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::int + 1, 1) ||
                SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::int + 1, 1) ||
                SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::int + 1, 1) ||
                SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::int + 1, 1) ||
                SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::int + 1, 1);
    
    SELECT EXISTS(SELECT 1 FROM public.rooms WHERE invite_code = new_code) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.set_room_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  IF NEW.invite_link IS NULL OR NEW.invite_link = '' THEN
    NEW.invite_link := 'settlesync.app/join/' || NEW.invite_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS room_invite_code_trigger ON public.rooms;
CREATE TRIGGER room_invite_code_trigger
BEFORE INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_room_invite_code();

-- 6. AUTO UPDATE ROOM TOTAL_SPENT ON EXPENSE CHANGES
CREATE OR REPLACE FUNCTION public.update_room_total_spent()
RETURNS TRIGGER AS $$
DECLARE
  target_room_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_room_id := OLD.room_id;
  ELSE
    target_room_id := NEW.room_id;
  END IF;

  UPDATE public.rooms
  SET total_spent = COALESCE((
    SELECT SUM(amount) FROM public.expenses WHERE room_id = target_room_id
  ), 0),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = target_room_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_room_total_spent ON public.expenses;
CREATE TRIGGER trigger_update_room_total_spent
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_room_total_spent();

-- 7. DYNAMIC EXPENSE SPLIT RECALCULATION WHEN A NEW MEMBER JOINS
CREATE OR REPLACE FUNCTION public.recalculate_splits_on_member_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exp_record RECORD;
  m_count INT;
  new_split_amt DECIMAL(12, 2);
  m_record RECORD;
BEGIN
  -- For each expense in this room that has split_all = TRUE
  FOR exp_record IN 
    SELECT id, amount FROM public.expenses 
    WHERE room_id = NEW.room_id AND split_all = TRUE
  LOOP
    -- Count total unique members (members + creator)
    SELECT COUNT(DISTINCT uid) INTO m_count
    FROM (
      SELECT user_id as uid FROM public.room_members WHERE room_id = NEW.room_id
      UNION
      SELECT created_by as uid FROM public.rooms WHERE id = NEW.room_id
    ) t;

    IF m_count > 0 THEN
      new_split_amt := (exp_record.amount / m_count)::DECIMAL(12, 2);

      -- Upsert/insert splits for every member
      FOR m_record IN
        SELECT DISTINCT uid FROM (
          SELECT user_id as uid FROM public.room_members WHERE room_id = NEW.room_id
          UNION
          SELECT created_by as uid FROM public.rooms WHERE id = NEW.room_id
        ) t
      LOOP
        INSERT INTO public.expense_splits (expense_id, user_id, amount)
        VALUES (exp_record.id, m_record.uid, new_split_amt)
        ON CONFLICT (expense_id, user_id) 
        DO UPDATE SET amount = new_split_amt;
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalculate_splits_on_member_join ON public.room_members;
CREATE TRIGGER trigger_recalculate_splits_on_member_join
AFTER INSERT ON public.room_members
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_splits_on_member_join();

-- 8. AUTOMATIC PROFILE CREATION ON SIGNUP
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  display_name_value := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );
  
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, display_name_value)
  ON CONFLICT (id) DO UPDATE
  SET display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_on_signup();

-- 9. ROOM BALANCES RPC FUNCTION
CREATE OR REPLACE FUNCTION public.calculate_room_balances(room_id_param UUID)
RETURNS TABLE(
  user_id UUID,
  display_name VARCHAR(255),
  upi_id VARCHAR(255),
  balance DECIMAL(12, 2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH member_list AS (
    SELECT rm.user_id as m_uid
    FROM public.room_members rm
    WHERE rm.room_id = room_id_param
    UNION
    SELECT r.created_by as m_uid
    FROM public.rooms r
    WHERE r.id = room_id_param
  ),
  user_paid AS (
    SELECT e.paid_by as u_id, COALESCE(SUM(e.amount), 0) as paid_sum
    FROM public.expenses e
    WHERE e.room_id = room_id_param
    GROUP BY e.paid_by
  ),
  user_owed AS (
    SELECT es.user_id as u_id, COALESCE(SUM(es.amount), 0) as owed_sum
    FROM public.expense_splits es
    JOIN public.expenses e ON e.id = es.expense_id
    WHERE e.room_id = room_id_param
    GROUP BY es.user_id
  )
  SELECT 
    p.id as user_id,
    p.display_name,
    p.upi_id,
    (COALESCE(up.paid_sum, 0) - COALESCE(uo.owed_sum, 0))::DECIMAL(12, 2) as balance
  FROM member_list ml
  JOIN public.profiles p ON p.id = ml.m_uid
  LEFT JOIN user_paid up ON up.u_id = p.id
  LEFT JOIN user_owed uo ON uo.u_id = p.id;
END;
$$;

-- 10. PERMISSIONS & GRANTS
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
