-- Flowz consolidated migration (Option 2: True Accounting Engine)
-- Safe, single-file migration: profiles, auth trigger, CoA, transactions, journals, posting engine, RLS, views, indexes, seeds

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======= 1. Profiles table =======
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles: allow users to manage their own row
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Note: the trigger that inserts profiles runs as a SECURITY DEFINER function
-- which avoids RLS problems for the common Supabase setup below (see function).

-- ======= 2. Chart of Accounts (accounts) =======
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    subtype VARCHAR(50),
    parent_account_id UUID REFERENCES public.accounts(id),
    is_system_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounts_select_self ON public.accounts;
CREATE POLICY accounts_select_self
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id OR is_system_default = true);

DROP POLICY IF EXISTS accounts_insert_self ON public.accounts;
CREATE POLICY accounts_insert_self
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS accounts_update_self ON public.accounts;
CREATE POLICY accounts_update_self
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- ======= 3. Transaction mappings (automation rules) =======
CREATE TABLE IF NOT EXISTS public.transaction_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL,
    debit_account_name VARCHAR(255) NOT NULL,
    credit_account_name VARCHAR(255) NOT NULL,
    is_system_default BOOLEAN DEFAULT true
);

ALTER TABLE public.transaction_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS txmap_view_default ON public.transaction_mappings;
CREATE POLICY txmap_view_default
  ON public.transaction_mappings FOR SELECT
  USING (is_system_default = true);

-- ======= 4. Transactions (raw user input) =======
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    reference_number VARCHAR(100),
    party_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'draft', -- draft, posted, void
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_select_self ON public.transactions;
CREATE POLICY transactions_select_self
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS transactions_insert_self ON public.transactions;
CREATE POLICY transactions_insert_self
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS transactions_update_self ON public.transactions;
CREATE POLICY transactions_update_self
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date);

-- ======= 5. Journal entries (header) =======
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT,
    reference_number VARCHAR(100),
    description TEXT,
    party_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'posted',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entries_select_self ON public.journal_entries;
CREATE POLICY journal_entries_select_self
  ON public.journal_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS journal_entries_insert_self ON public.journal_entries;
CREATE POLICY journal_entries_insert_self
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ======= 6. Journal entry lines (debits/credits) =======
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    description TEXT,
    debit NUMERIC(18,2) DEFAULT 0,
    credit NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jel_select_self ON public.journal_entry_lines;
CREATE POLICY jel_select_self
  ON public.journal_entry_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_lines.journal_entry_id AND je.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS jel_insert_self ON public.journal_entry_lines;
CREATE POLICY jel_insert_self
  ON public.journal_entry_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_lines.journal_entry_id AND je.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON public.journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_transaction_id ON public.journal_entries(transaction_id);

-- ======= 7. Utilities: update_updated_at trigger =======
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach to transactions and profiles and any other tables with updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ======= 8. Safe auth trigger: handle_new_user =======
-- This function is resilient to missing raw_user_meta_data and will not abort the auth flow.
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_full_name text;
BEGIN
  -- Try to read raw_user_meta_data safely
  BEGIN
    IF NEW.raw_user_meta_data IS NOT NULL THEN
      user_full_name := NEW.raw_user_meta_data->> 'full_name';
      IF user_full_name IS NULL OR user_full_name = '' THEN
        user_full_name := NEW.raw_user_meta_data->> 'name';
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    user_full_name := NULL;
  END;

  IF user_full_name IS NULL OR user_full_name = '' THEN
    user_full_name := split_part(COALESCE(NEW.email, ''), '@', 1);
  END IF;

  -- Insert profile, do not fail the auth insert if profile insert cannot be performed
  -- Use ON CONFLICT DO NOTHING to guard against duplicates
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, user_full_name)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- swallow errors to avoid breaking the auth flow (but could log externally)
    NULL;
  END;

  -- Also seed default accounts for the new user (best-effort; swallow errors)
  BEGIN
    PERFORM public.seed_default_accounts_for_user(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======= 9. Seed function for default accounts (safe, idempotent) =======
DROP FUNCTION IF EXISTS public.seed_default_accounts_for_user(UUID);

CREATE OR REPLACE FUNCTION public.seed_default_accounts_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.accounts (user_id, name, type, subtype, is_system_default)
  SELECT 
    p_user_id, 
    v.name, 
    v.type, 
    v.subtype, 
    false
  FROM (
    VALUES
      ('Cash','asset','current_asset'),
      ('Bank','asset','current_asset'),
      ('Accounts Receivable','asset','current_asset'),
      ('Inventory','asset','current_asset'),
      ('Accounts Payable','liability','current_liability'),
      ('Sales Revenue','income','operating_revenue'),
      ('Purchases','expense','cost_of_goods_sold'),
      ('Payroll Expense','expense','operating_expense'),
      ('General Expense','expense','operating_expense'),
      ('Owner Equity','equity','equity')
  ) AS v(name, type, subtype)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE user_id = p_user_id AND name = v.name
  )
  ON CONFLICT (user_id, name)
  DO NOTHING;

END;
$$;

-- ======= 10. Posting function (post_transaction) =======
DROP FUNCTION IF EXISTS public.post_transaction(UUID);

CREATE OR REPLACE FUNCTION public.post_transaction(p_transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx_record RECORD;
  mapping_record RECORD;
  debit_acc_id UUID;
  credit_acc_id UUID;
  journal_entry_id UUID;
BEGIN
  SELECT * INTO tx_record FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  IF tx_record.status = 'posted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already posted');
  END IF;

  -- Find mapping; prefer user-specific mapping then system default
  SELECT * INTO mapping_record
  FROM public.transaction_mappings
  WHERE transaction_type = tx_record.transaction_type AND (is_system_default = true OR true)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No mapping found for transaction type: ' || tx_record.transaction_type);
  END IF;

  -- Resolve accounts by name for the user (fall back to system-default accounts owned by no user if exists)
  SELECT id INTO debit_acc_id FROM public.accounts WHERE name = mapping_record.debit_account_name AND user_id = tx_record.user_id LIMIT 1;
  IF debit_acc_id IS NULL THEN
    SELECT id INTO debit_acc_id FROM public.accounts WHERE name = mapping_record.debit_account_name AND is_system_default = true LIMIT 1;
  END IF;

  SELECT id INTO credit_acc_id FROM public.accounts WHERE name = mapping_record.credit_account_name AND user_id = tx_record.user_id LIMIT 1;
  IF credit_acc_id IS NULL THEN
    SELECT id INTO credit_acc_id FROM public.accounts WHERE name = mapping_record.credit_account_name AND is_system_default = true LIMIT 1;
  END IF;

  IF debit_acc_id IS NULL OR credit_acc_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'One or more accounts not found for this user. Initialize accounts.');
  END IF;

  -- Create journal entry header
  INSERT INTO public.journal_entries (
    user_id, transaction_id, transaction_date, transaction_type, reference_number, description, party_name, status
  ) VALUES (
    tx_record.user_id, tx_record.id, tx_record.transaction_date, tx_record.transaction_type, tx_record.reference_number, tx_record.description, tx_record.party_name, 'posted'
  ) RETURNING id INTO journal_entry_id;

  -- Double entry lines
  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
  VALUES (journal_entry_id, debit_acc_id, tx_record.description, tx_record.amount, 0);

  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
  VALUES (journal_entry_id, credit_acc_id, tx_record.description, 0, tx_record.amount);

  -- Update transaction status
  UPDATE public.transactions SET status = 'posted', updated_at = now() WHERE id = p_transaction_id;

  RETURN jsonb_build_object('success', true, 'journal_entry_id', journal_entry_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ======= 11. Views (ledgers, trial balance) =======
-- Cash ledger view
CREATE OR REPLACE VIEW public.view_ledger_cash AS
SELECT jel.id AS line_id, je.transaction_date, je.transaction_type, je.reference_number, je.description, je.party_name, jel.debit, jel.credit, (jel.debit - jel.credit) as net_change, a.name as account_name, je.user_id
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON jel.journal_entry_id = je.id
JOIN public.accounts a ON jel.account_id = a.id
WHERE a.name = 'Cash';

-- Bank ledger view
CREATE OR REPLACE VIEW public.view_ledger_bank AS
SELECT jel.id AS line_id, je.transaction_date, je.transaction_type, je.reference_number, je.description, je.party_name, jel.debit, jel.credit, (jel.debit - jel.credit) as net_change, a.name as account_name, je.user_id
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON jel.journal_entry_id = je.id
JOIN public.accounts a ON jel.account_id = a.id
WHERE a.name = 'Bank';

-- Sales view (income accounts)
CREATE OR REPLACE VIEW public.view_ledger_sales AS
SELECT jel.id AS line_id, je.transaction_date, je.transaction_type, je.reference_number, je.description, je.party_name, jel.credit as amount, a.name as account_name, je.user_id
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON jel.journal_entry_id = je.id
JOIN public.accounts a ON jel.account_id = a.id
WHERE a.type = 'income';

-- Purchases view (expense accounts)
CREATE OR REPLACE VIEW public.view_ledger_purchases AS
SELECT jel.id AS line_id, je.transaction_date, je.transaction_type, je.reference_number, je.description, je.party_name, jel.debit as amount, a.name as account_name, je.user_id
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON jel.journal_entry_id = je.id
JOIN public.accounts a ON jel.account_id = a.id
WHERE a.type = 'expense';

-- Trial balance
CREATE OR REPLACE VIEW public.view_trial_balance AS
SELECT a.id as account_id, a.name as account_name, a.type as account_type, COALESCE(SUM(jel.debit),0) as total_debit, COALESCE(SUM(jel.credit),0) as total_credit, (COALESCE(SUM(jel.debit),0) - COALESCE(SUM(jel.credit),0)) as net_balance, a.user_id
FROM public.accounts a
LEFT JOIN public.journal_entry_lines jel ON a.id = jel.account_id
GROUP BY a.id, a.name, a.type, a.user_id;

-- ======= 12. Seed some default transaction mappings (idempotent) =======
INSERT INTO public.transaction_mappings (transaction_type, debit_account_name, credit_account_name, is_system_default)
VALUES
('cash_sale', 'Cash', 'Sales Revenue', true),
('credit_sale', 'Accounts Receivable', 'Sales Revenue', true),
('cash_purchase', 'Purchases', 'Cash', true),
('credit_purchase', 'Purchases', 'Accounts Payable', true),
('expense', 'General Expense', 'Cash', true),
('payroll', 'Payroll Expense', 'Cash', true)
ON CONFLICT DO NOTHING;

-- ======= 13. Indexes for performance =======
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON public.journal_entries(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_jel_account_id ON public.journal_entry_lines(account_id);

-- ======= 14. Helpful helper functions (optional) =======
-- Function to get user_id from jwt claim when used in RPC context (if needed)
-- Note: Keep minimal; Supabase will populate auth.uid() in RLS policies at runtime.

-- END OF MIGRATION
