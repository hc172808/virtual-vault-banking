-- Update process_transfer function to charge fees to both sender and receiver
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
BEGIN
  v_sender_id := auth.uid();
  
  -- Get sender fee settings
  SELECT CAST(setting_value AS NUMERIC) INTO v_sender_fee_percentage 
  FROM system_settings WHERE setting_key = 'transfer_fee_percentage';
  
  SELECT CAST(setting_value AS NUMERIC) INTO v_sender_fee_fixed 
  FROM system_settings WHERE setting_key = 'transfer_fee_fixed';
  
  -- Get receiver fee settings
  SELECT CAST(setting_value AS NUMERIC) INTO v_receiver_fee_percentage 
  FROM system_settings WHERE setting_key = 'receiver_fee_percentage';
  
  SELECT CAST(setting_value AS NUMERIC) INTO v_receiver_fee_fixed 
  FROM system_settings WHERE setting_key = 'receiver_fee_fixed';
  
  -- Calculate fees
  v_sender_total_fee := (p_amount * v_sender_fee_percentage / 100) + v_sender_fee_fixed;
  v_sender_total_amount := p_amount + v_sender_total_fee;
  
  v_receiver_total_fee := (p_amount * v_receiver_fee_percentage / 100) + v_receiver_fee_fixed;
  v_recipient_receives := p_amount - v_receiver_total_fee;
  
  -- Get balances
  SELECT balance INTO v_sender_balance FROM profiles WHERE user_id = v_sender_id;
  SELECT balance INTO v_recipient_balance FROM profiles WHERE user_id = p_recipient_id;
  
  -- Check sender has sufficient balance
  IF v_sender_balance < v_sender_total_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;
  
  -- Check receiver can pay the fee
  IF v_recipient_balance + v_recipient_receives < 0 THEN
    RETURN json_build_object('success', false, 'error', 'Recipient cannot receive - insufficient balance for fees');
  END IF;
  
  -- Update balances
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
END;
$function$;