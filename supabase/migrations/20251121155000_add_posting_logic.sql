-- Function to Post a Transaction (Core Accounting Logic)
CREATE OR REPLACE FUNCTION post_transaction(transaction_id UUID)
RETURNS JSONB AS $$
DECLARE
    tx_record RECORD;
    mapping_record RECORD;
    debit_acc_id UUID;
    credit_acc_id UUID;
    journal_entry_id UUID;
    new_status VARCHAR;
BEGIN
    -- 1. Fetch Transaction
    SELECT * INTO tx_record FROM transactions WHERE id = transaction_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
    END IF;

    IF tx_record.status = 'posted' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction already posted');
    END IF;

    -- 2. Find Mapping Rule
    SELECT * INTO mapping_record 
    FROM transaction_mappings 
    WHERE transaction_type = tx_record.transaction_type 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No mapping found for transaction type: ' || tx_record.transaction_type);
    END IF;

    -- 3. Resolve Accounts
    SELECT id INTO debit_acc_id FROM accounts WHERE name = mapping_record.debit_account_name AND user_id = tx_record.user_id;
    -- If not found, try system default (for shared accounts like 'Cash' if they are system wide, but usually they are per user)
    -- In this schema, accounts are per user.
    
    SELECT id INTO credit_acc_id FROM accounts WHERE name = mapping_record.credit_account_name AND user_id = tx_record.user_id;

    IF debit_acc_id IS NULL OR credit_acc_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'One or more accounts not found for this user. Please initialize default accounts.');
    END IF;

    -- 4. Create Journal Entry Header
    INSERT INTO journal_entries (
        user_id,
        transaction_id,
        transaction_date,
        transaction_type,
        reference_number,
        description,
        party_name,
        status
    ) VALUES (
        tx_record.user_id,
        tx_record.id,
        tx_record.transaction_date,
        tx_record.transaction_type,
        tx_record.reference_number,
        tx_record.description,
        tx_record.party_name,
        'posted'
    ) RETURNING id INTO journal_entry_id;

    -- 5. Create Journal Entry Lines (Double Entry)
    -- DEBIT
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit,
        credit
    ) VALUES (
        journal_entry_id,
        debit_acc_id,
        tx_record.description,
        tx_record.amount,
        0
    );

    -- CREDIT
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit,
        credit
    ) VALUES (
        journal_entry_id,
        credit_acc_id,
        tx_record.description,
        0,
        tx_record.amount
    );

    -- 6. Update Transaction Status
    UPDATE transactions SET status = 'posted' WHERE id = transaction_id;

    RETURN jsonb_build_object('success', true, 'journal_entry_id', journal_entry_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
