-- Add missing transaction mappings
INSERT INTO transaction_mappings (transaction_type, debit_account_name, credit_account_name) VALUES
('cash_payment', 'Accounts Payable', 'Cash'),
('cash_receipt', 'Cash', 'Accounts Receivable'),
('bank_payment', 'Accounts Payable', 'Bank'),
('bank_receipt', 'Bank', 'Accounts Receivable'),
('sales_return', 'Sales Revenue', 'Accounts Receivable'),
('purchase_return', 'Accounts Payable', 'Purchases'),
('asset_purchase', 'Inventory', 'Cash'), -- Default to Inventory for assets, user can change
('asset_disposal', 'Cash', 'Inventory'),
('loan_received', 'Cash', 'Accounts Payable'), -- Treating as generic liability
('loan_payment', 'Accounts Payable', 'Cash'),
('adjustment', 'General Expense', 'Cash'), -- Generic fallback
('opening_balance', 'Cash', 'Owner Equity')
ON CONFLICT DO NOTHING;
