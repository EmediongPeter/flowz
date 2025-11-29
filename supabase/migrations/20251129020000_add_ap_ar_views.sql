-- VIEW: Accounts Payable Ledger
CREATE OR REPLACE VIEW view_ledger_accounts_payable AS
SELECT 
    jel.id,
    je.transaction_date,
    je.transaction_type,
    je.reference_number,
    je.description,
    je.party_name,
    jel.debit,
    jel.credit,
    (jel.credit - jel.debit) as net_change, -- Liability: Credit increases, Debit decreases
    a.name as account_name,
    je.user_id
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN accounts a ON jel.account_id = a.id
WHERE a.type = 'accounts_payable';

-- VIEW: Accounts Receivable Ledger
CREATE OR REPLACE VIEW view_ledger_accounts_receivable AS
SELECT 
    jel.id,
    je.transaction_date,
    je.transaction_type,
    je.reference_number,
    je.description,
    je.party_name,
    jel.debit,
    jel.credit,
    (jel.debit - jel.credit) as net_change, -- Asset: Debit increases, Credit decreases
    a.name as account_name,
    je.user_id
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN accounts a ON jel.account_id = a.id
WHERE a.type = 'accounts_receivable';

-- Grant permissions
GRANT SELECT ON view_ledger_accounts_payable TO postgres, anon, authenticated, service_role;
GRANT SELECT ON view_ledger_accounts_receivable TO postgres, anon, authenticated, service_role;
