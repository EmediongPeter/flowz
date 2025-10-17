-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create enum for account types
CREATE TYPE public.account_type AS ENUM (
  'cash',
  'bank',
  'sales',
  'purchase',
  'accounts_payable',
  'accounts_receivable',
  'inventory',
  'payroll',
  'other'
);

-- Create enum for entry type (debit or credit)
CREATE TYPE public.entry_type AS ENUM ('debit', 'credit');

-- Create journal entries table
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  reference_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Journal entries policies
CREATE POLICY "Users can view own entries"
  ON public.journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON public.journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Create journal entry lines (the actual debits and credits)
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_type public.account_type NOT NULL,
  account_name TEXT NOT NULL,
  entry_type public.entry_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on journal_entry_lines
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Journal entry lines policies
CREATE POLICY "Users can view own entry lines"
  ON public.journal_entry_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE id = journal_entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own entry lines"
  ON public.journal_entry_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE id = journal_entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own entry lines"
  ON public.journal_entry_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE id = journal_entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own entry lines"
  ON public.journal_entry_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE id = journal_entry_id AND user_id = auth.uid()
    )
  );

-- Trigger to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();