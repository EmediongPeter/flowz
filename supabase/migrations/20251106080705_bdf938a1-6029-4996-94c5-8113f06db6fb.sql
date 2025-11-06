-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.assign_book_category(tx_type public.transaction_type)
RETURNS public.book_category
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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