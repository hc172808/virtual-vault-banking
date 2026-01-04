-- Improve process_transfer function with security hardening
-- 1. Add recipient validation
-- 2. Add row locking to prevent race conditions
-- 3. Add sender != recipient validation
-- 4. Add balance constraint

-- First add a CHECK constraint to prevent negative balances
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_balance_non_negative CHECK (balance >= 0);

-- Drop and recreate the process_transfer function with security improvements
CREATE OR REPLACE FUNCTION public.process_transfer(p_recipient_id uuid, p_amount numeric, p_description text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id UUID;
  v_sender_balance NUMERIC;
  v_recipient_balance NUMERIC;
  v_sender_fee_percentage NUMERIC;
  v_sender_fee_fixed NUMERIC;
  v_receiver_fee_percentage NUMERIC;
  v_receiver_fee_fixed NUMERIC;
  v_sender_total_fee NUMERIC;
  v_receiver_total_fee NUMERIC;
  v_sender_total_amount NUMERIC;
  v_recipient_receives NUMERIC;
  v_transaction_id UUID;
  v_recipient_exists BOOLEAN;
BEGIN
  v_sender_id := auth.uid();
  
  -- Validate sender is authenticated
  IF v_sender_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate sender and recipient are different
  IF v_sender_id = p_recipient_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;
  
  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  -- Check recipient exists and lock the row
  SELECT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_recipient_id FOR UPDATE) INTO v_recipient_exists;
  IF NOT v_recipient_exists THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;
  
  -- Get fee settings with defaults if not set
  SELECT COALESCE(CAST(setting_value AS NUMERIC), 0) INTO v_sender_fee_percentage 
  FROM system_settings WHERE setting_key = 'transfer_fee_percentage';
  v_sender_fee_percentage := COALESCE(v_sender_fee_percentage, 0);
  
  SELECT COALESCE(CAST(setting_value AS NUMERIC), 0) INTO v_sender_fee_fixed 
  FROM system_settings WHERE setting_key = 'transfer_fee_fixed';
  v_sender_fee_fixed := COALESCE(v_sender_fee_fixed, 0);
  
  SELECT COALESCE(CAST(setting_value AS NUMERIC), 0) INTO v_receiver_fee_percentage 
  FROM system_settings WHERE setting_key = 'receiver_fee_percentage';
  v_receiver_fee_percentage := COALESCE(v_receiver_fee_percentage, 0);
  
  SELECT COALESCE(CAST(setting_value AS NUMERIC), 0) INTO v_receiver_fee_fixed 
  FROM system_settings WHERE setting_key = 'receiver_fee_fixed';
  v_receiver_fee_fixed := COALESCE(v_receiver_fee_fixed, 0);
  
  -- Calculate fees
  v_sender_total_fee := (p_amount * v_sender_fee_percentage / 100) + v_sender_fee_fixed;
  v_sender_total_amount := p_amount + v_sender_total_fee;
  
  v_receiver_total_fee := (p_amount * v_receiver_fee_percentage / 100) + v_receiver_fee_fixed;
  v_recipient_receives := p_amount - v_receiver_total_fee;
  
  -- Lock sender row and get balance to prevent race conditions
  SELECT balance INTO v_sender_balance FROM profiles WHERE user_id = v_sender_id FOR UPDATE;
  
  IF v_sender_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender profile not found');
  END IF;
  
  -- Check sender has sufficient balance
  IF v_sender_balance < v_sender_total_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;
  
  -- Get recipient balance (already locked above)
  SELECT balance INTO v_recipient_balance FROM profiles WHERE user_id = p_recipient_id;
  
  -- Check receiver can pay the fee (balance won't go negative)
  IF v_recipient_balance + v_recipient_receives < 0 THEN
    RETURN json_build_object('success', false, 'error', 'Recipient cannot receive - insufficient balance for fees');
  END IF;
  
  -- Update balances atomically
  UPDATE profiles SET balance = balance - v_sender_total_amount WHERE user_id = v_sender_id;
  UPDATE profiles SET balance = balance + v_recipient_receives WHERE user_id = p_recipient_id;
  
  -- Create transaction record
  INSERT INTO transactions (sender_id, recipient_id, amount, fee, total_amount, description)
  VALUES (v_sender_id, p_recipient_id, p_amount, v_sender_total_fee + v_receiver_total_fee, v_sender_total_amount, p_description)
  RETURNING id INTO v_transaction_id;
  
  -- Log activity
  INSERT INTO activity_logs (user_id, action_type, description)
  VALUES (v_sender_id, 'TRANSFER_SENT', 'Sent $' || p_amount || ' (sender fee: $' || v_sender_total_fee || ')');
  
  INSERT INTO activity_logs (user_id, action_type, description)
  VALUES (p_recipient_id, 'TRANSFER_RECEIVED', 'Received $' || v_recipient_receives || ' (receiver fee: $' || v_receiver_total_fee || ')');
  
  RETURN json_build_object(
    'success', true, 
    'transaction_id', v_transaction_id,
    'amount', p_amount,
    'sender_fee', v_sender_total_fee,
    'receiver_fee', v_receiver_total_fee,
    'total_sender_paid', v_sender_total_amount,
    'total_recipient_received', v_recipient_receives
  );
EXCEPTION
  WHEN check_violation THEN
    RETURN json_build_object('success', false, 'error', 'Transaction would result in negative balance');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Transaction failed: ' || SQLERRM);
END;
$function$;