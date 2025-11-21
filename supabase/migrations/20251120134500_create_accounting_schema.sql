-- Create accounts table (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    subtype VARCHAR(50),
    parent_account_id UUID REFERENCES accounts(id),
    is_system_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts" ON accounts
    FOR SELECT USING (auth.uid() = user_id OR is_system_default = true);

CREATE POLICY "Users can insert their own accounts" ON accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" ON accounts
    FOR UPDATE USING (auth.uid() = user_id);

-- Create transaction_mappings table (Automation Rules)
CREATE TABLE IF NOT EXISTS transaction_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(50) NOT NULL,
    debit_account_name VARCHAR(255) NOT NULL,
    credit_account_name VARCHAR(255) NOT NULL,
    is_system_default BOOLEAN DEFAULT true
);

-- Enable RLS on transaction_mappings
ALTER TABLE transaction_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view default mappings" ON transaction_mappings
    FOR SELECT USING (is_system_default = true);

-- Seed default mappings
INSERT INTO transaction_mappings (transaction_type, debit_account_name, credit_account_name) VALUES
('cash_sale', 'Cash', 'Sales Revenue'),
('credit_sale', 'Accounts Receivable', 'Sales Revenue'),
('cash_purchase', 'Purchases', 'Cash'),
('credit_purchase', 'Purchases', 'Accounts Payable'),
('expense', 'General Expense', 'Cash'),
('payroll', 'Payroll Expense', 'Cash')
ON CONFLICT DO NOTHING;

-- Create journal_entries table (Header)
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    description TEXT,
    party_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'posted',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on journal_entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries" ON journal_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries" ON journal_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create journal_entry_lines table (Debits/Credits)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    description TEXT,
    debit DECIMAL(12, 2) DEFAULT 0,
    credit DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on journal_entry_lines
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entry lines" ON journal_entry_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journal_entries
            WHERE journal_entries.id = journal_entry_lines.journal_entry_id
            AND journal_entries.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own entry lines" ON journal_entry_lines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM journal_entries
            WHERE journal_entries.id = journal_entry_lines.journal_entry_id
            AND journal_entries.user_id = auth.uid()
        )
    );

-- Function to seed default accounts for new users
CREATE OR REPLACE FUNCTION seed_default_accounts()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO accounts (user_id, name, type, subtype, is_system_default) VALUES
    (NEW.id, 'Cash', 'asset', 'current_asset', false),
    (NEW.id, 'Bank', 'asset', 'current_asset', false),
    (NEW.id, 'Accounts Receivable', 'asset', 'current_asset', false),
    (NEW.id, 'Inventory', 'asset', 'current_asset', false),
    (NEW.id, 'Accounts Payable', 'liability', 'current_liability', false),
    (NEW.id, 'Sales Revenue', 'income', 'operating_revenue', false),
    (NEW.id, 'Purchases', 'expense', 'cost_of_goods_sold', false),
    (NEW.id, 'Payroll Expense', 'expense', 'operating_expense', false),
    (NEW.id, 'General Expense', 'expense', 'operating_expense', false),
    (NEW.id, 'Owner Equity', 'equity', 'equity', false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to seed accounts on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_seed_accounts ON auth.users;
CREATE TRIGGER on_auth_user_created_seed_accounts
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION seed_default_accounts();

-- Function to manually initialize accounts for existing users
CREATE OR REPLACE FUNCTION initialize_default_accounts()
RETURNS VOID AS $$
DECLARE
    curr_user_id UUID;
BEGIN
    curr_user_id := auth.uid();
    
    INSERT INTO accounts (user_id, name, type, subtype, is_system_default) VALUES
    (curr_user_id, 'Cash', 'asset', 'current_asset', false),
    (curr_user_id, 'Bank', 'asset', 'current_asset', false),
    (curr_user_id, 'Accounts Receivable', 'asset', 'current_asset', false),
    (curr_user_id, 'Inventory', 'asset', 'current_asset', false),
    (curr_user_id, 'Accounts Payable', 'liability', 'current_liability', false),
    (curr_user_id, 'Sales Revenue', 'income', 'operating_revenue', false),
    (curr_user_id, 'Purchases', 'expense', 'cost_of_goods_sold', false),
    (curr_user_id, 'Payroll Expense', 'expense', 'operating_expense', false),
    (curr_user_id, 'General Expense', 'expense', 'operating_expense', false),
    (curr_user_id, 'Owner Equity', 'equity', 'equity', false)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
