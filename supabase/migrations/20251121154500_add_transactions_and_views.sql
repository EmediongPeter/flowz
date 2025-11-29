-- Create transactions table (Raw User Input)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    reference_number VARCHAR(100),
    party_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'draft', -- draft, posted, void
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

--- CREATE POLICY "Users can view their own transactions" ON transactions
    -- FOR SELECT USING (auth.uid() = user_id);

--- CREATE POLICY "Users can insert their own transactions" ON transactions
    -- FOR INSERT WITH CHECK (auth.uid() = user_id);

--- CREATE POLICY "Users can update their own transactions" ON transactions
    -- FOR UPDATE USING (auth.uid() = user_id);

-- Link journal_entries to transactions
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_transaction_id ON journal_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);

-- VIEW: Cash Book (Cash Account Activity)
CREATE OR REPLACE VIEW view_ledger_cash AS
SELECT 
    jel.id,
    je.transaction_date,
    je.transaction_type,
    je.reference_number,
    je.description,
    je.party_name,
    jel.debit,
    jel.credit,
    (jel.debit - jel.credit) as net_change,
    a.name as account_name,
    je.user_id
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN accounts a ON jel.account_id = a.id
WHERE a.name = 'Cash'; -- Assumes 'Cash' account name is standard

-- VIEW: Bank Book
CREATE OR REPLACE VIEW view_ledger_bank AS
SELECT 
    jel.id,
    je.transaction_date,
    je.transaction_type,
    je.reference_number,
    je.description,
    je.party_name,
    jel.debit,
    jel.credit,
    (jel.debit - jel.credit) as net_change,
    a.name as account_name,
    je.user_id
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN accounts a ON jel.account_id = a.id
WHERE a.name = 'Bank';

-- VIEW: Sales Book (Sales Revenue)
CREATE OR REPLACE VIEW view_ledger_sales AS
SELECT 
    jel.id,
    je.transaction_date,
    je.transaction_type,
    je.reference_number,
    je.description,
    je.party_name,
    jel.credit as amount, -- Sales are credit nature
    a.name as account_name,
    je.user_id
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN accounts a ON jel.account_id = a.id
WHERE a.type = 'income';

-- VIEW: Purchase Book (Expenses/Cost of Goods)
CREATE OR REPLACE VIEW view_ledger_purchases AS
SELECT 
    jel.id,
    je.transaction_date,
    je.transaction_type,
    je.reference_number,
    je.description,
    je.party_name,
    jel.debit as amount, -- Expenses are debit nature
    a.name as account_name,
    je.user_id
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN accounts a ON jel.account_id = a.id
WHERE a.type = 'expense';

-- VIEW: Trial Balance (Aggregated by Account)
CREATE OR REPLACE VIEW view_trial_balance AS
SELECT 
    a.id as account_id,
    a.name as account_name,
    a.type as account_type,
    SUM(jel.debit) as total_debit,
    SUM(jel.credit) as total_credit,
    (SUM(jel.debit) - SUM(jel.credit)) as net_balance,
    a.user_id
FROM accounts a
LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
GROUP BY a.id, a.name, a.type, a.user_id;
