-- Drop existing tables to recreate with comprehensive structure
DROP TABLE IF EXISTS public.journal_entry_lines CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS public.account_type CASCADE;
DROP TYPE IF EXISTS public.entry_type CASCADE;

-- Create comprehensive enums for the new system
CREATE TYPE public.transaction_type AS ENUM (
  'cash_sale',
  'credit_sale',
  'cash_purchase',
  'credit_purchase',
  'sales_return',
  'purchase_return',
  'cash_receipt',
  'cash_payment',
  'bank_receipt',
  'bank_payment',
  'payroll',
  'expense',
  'asset_purchase',
  'asset_disposal',
  'loan_received',
  'loan_payment',
  'adjustment',
  'opening_balance'
);

CREATE TYPE public.party_type AS ENUM (
  'customer',
  'supplier',
  'employee',
  'other'
);

CREATE TYPE public.payment_type AS ENUM (
  'cash',
  'bank',
  'credit'
);

CREATE TYPE public.payment_mode AS ENUM (
  'cash',
  'bank_transfer',
  'cheque',
  'pos',
  'online',
  'mobile_money'
);

CREATE TYPE public.book_category AS ENUM (
  'sales_book',
  'purchase_book',
  'sales_return_book',
  'purchase_return_book',
  'cash_book',
  'bank_book',
  'payroll_book',
  'general_journal',
  'petty_cash_book',
  'bills_receivable_book',
  'bills_payable_book'
);

-- Create the main entries table with comprehensive fields
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Transaction Identity
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type public.transaction_type NOT NULL,
  reference_number TEXT,
  book_category public.book_category NOT NULL,
  
  -- Party Details
  party_name TEXT,
  party_type public.party_type,
  party_contact TEXT,
  
  -- Transaction Description
  description TEXT NOT NULL,
  category TEXT,
  product_service_name TEXT,
  quantity NUMERIC(15, 4),
  unit_price NUMERIC(15, 2),
  amount_before_tax NUMERIC(15, 2),
  discount NUMERIC(15, 2) DEFAULT 0,
  tax_rate NUMERIC(5, 2),
  tax_amount NUMERIC(15, 2),
  total_amount NUMERIC(15, 2) NOT NULL,
  
  -- Payment Information
  payment_type public.payment_type,
  payment_mode public.payment_mode,
  payment_reference TEXT,
  bank_name TEXT,
  bank_account TEXT,
  amount_paid NUMERIC(15, 2),
  balance_due NUMERIC(15, 2) DEFAULT 0,
  due_date DATE,
  
  -- Payroll-Specific Fields
  employee_id TEXT,
  gross_pay NUMERIC(15, 2),
  allowances NUMERIC(15, 2),
  deductions NUMERIC(15, 2),
  net_pay NUMERIC(15, 2),
  payment_period TEXT,
  
  -- Accounting Tags
  debit_account TEXT,
  credit_account TEXT,
  ledger_category TEXT,
  
  -- Additional fields
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on entries table
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for entries
CREATE POLICY "Users can view own entries"
  ON public.entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON public.entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.entries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON public.entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_entries_user_id ON public.entries(user_id);
CREATE INDEX idx_entries_transaction_date ON public.entries(transaction_date);
CREATE INDEX idx_entries_transaction_type ON public.entries(transaction_type);
CREATE INDEX idx_entries_book_category ON public.entries(book_category);
CREATE INDEX idx_entries_party_name ON public.entries(party_name);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to auto-assign book category based on transaction type
CREATE OR REPLACE FUNCTION public.assign_book_category(tx_type public.transaction_type)
RETURNS public.book_category
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE tx_type
    WHEN 'cash_sale' THEN 'sales_book'::public.book_category
    WHEN 'credit_sale' THEN 'sales_book'::public.book_category
    WHEN 'cash_purchase' THEN 'purchase_book'::public.book_category
    WHEN 'credit_purchase' THEN 'purchase_book'::public.book_category
    WHEN 'sales_return' THEN 'sales_return_book'::public.book_category
    WHEN 'purchase_return' THEN 'purchase_return_book'::public.book_category
    WHEN 'cash_receipt' THEN 'cash_book'::public.book_category
    WHEN 'cash_payment' THEN 'cash_book'::public.book_category
    WHEN 'bank_receipt' THEN 'bank_book'::public.book_category
    WHEN 'bank_payment' THEN 'bank_book'::public.book_category
    WHEN 'payroll' THEN 'payroll_book'::public.book_category
    WHEN 'expense' THEN 'petty_cash_book'::public.book_category
    WHEN 'adjustment' THEN 'general_journal'::public.book_category
    WHEN 'opening_balance' THEN 'general_journal'::public.book_category
    ELSE 'general_journal'::public.book_category
  END;
END;
$$;