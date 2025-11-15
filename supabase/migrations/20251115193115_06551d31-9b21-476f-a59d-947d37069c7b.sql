-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  bulk_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
CREATE POLICY "Users can view own products"
  ON public.products
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON public.products
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON public.products
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for products updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create profit_targets table
CREATE TABLE IF NOT EXISTS public.profit_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  monthly_target NUMERIC NOT NULL,
  yearly_target NUMERIC NOT NULL,
  target_month INTEGER NOT NULL,
  target_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_month, target_year)
);

-- Enable RLS for profit_targets
ALTER TABLE public.profit_targets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profit_targets
CREATE POLICY "Users can view own profit targets"
  ON public.profit_targets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profit targets"
  ON public.profit_targets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profit targets"
  ON public.profit_targets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profit targets"
  ON public.profit_targets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for profit_targets updated_at
CREATE TRIGGER update_profit_targets_updated_at
  BEFORE UPDATE ON public.profit_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();