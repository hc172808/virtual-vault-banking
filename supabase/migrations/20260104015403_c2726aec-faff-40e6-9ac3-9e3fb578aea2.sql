-- Create table for tracking failed attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  locked_until TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, action_type)
);

-- Enable RLS
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow the system (via SECURITY DEFINER functions) to access this table
CREATE POLICY "No direct access to rate limits"
  ON public.security_rate_limits
  FOR ALL
  TO authenticated
  USING (false);

-- Create server-side PIN verification function with rate limiting
CREATE OR REPLACE FUNCTION public.verify_transaction_pin(p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_stored_hash TEXT;
  v_computed_hash TEXT;
  v_attempt_count INTEGER;
  v_locked_until TIMESTAMP WITH TIME ZONE;
  v_lockout_minutes INTEGER := 15;
  v_max_attempts INTEGER := 5;
BEGIN
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate PIN format (4 digits)
  IF p_pin IS NULL OR length(p_pin) != 4 OR p_pin !~ '^\d{4}$' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid PIN format');
  END IF;
  
  -- Check rate limiting
  SELECT attempt_count, locked_until 
  INTO v_attempt_count, v_locked_until
  FROM security_rate_limits
  WHERE user_id = v_user_id AND action_type = 'pin_verification'
  FOR UPDATE;
  
  -- Check if locked out
  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Too many failed attempts. Try again later.',
      'locked_until', v_locked_until
    );
  END IF;
  
  -- Get stored PIN hash from profiles table
  SELECT pin_hash INTO v_stored_hash
  FROM profiles
  WHERE user_id = v_user_id;
  
  IF v_stored_hash IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'PIN not set');
  END IF;
  
  -- Compute hash server-side (same algorithm as client was using)
  SELECT encode(digest(p_pin || v_user_id::text, 'sha256'), 'hex') INTO v_computed_hash;
  
  -- Verify PIN
  IF v_computed_hash = v_stored_hash THEN
    -- Success: clear rate limiting
    DELETE FROM security_rate_limits 
    WHERE user_id = v_user_id AND action_type = 'pin_verification';
    
    -- Log successful verification
    INSERT INTO activity_logs (user_id, action_type, description)
    VALUES (v_user_id, 'PIN_VERIFIED', 'Transaction PIN verified successfully');
    
    RETURN json_build_object('success', true);
  ELSE
    -- Failed: update rate limiting
    INSERT INTO security_rate_limits (user_id, action_type, attempt_count, first_attempt_at, last_attempt_at, locked_until)
    VALUES (
      v_user_id, 
      'pin_verification', 
      1, 
      now(), 
      now(),
      CASE WHEN 1 >= v_max_attempts THEN now() + (v_lockout_minutes || ' minutes')::interval ELSE NULL END
    )
    ON CONFLICT (user_id, action_type) DO UPDATE SET
      attempt_count = CASE 
        WHEN security_rate_limits.first_attempt_at < now() - interval '1 hour' THEN 1 
        ELSE security_rate_limits.attempt_count + 1 
      END,
      first_attempt_at = CASE 
        WHEN security_rate_limits.first_attempt_at < now() - interval '1 hour' THEN now() 
        ELSE security_rate_limits.first_attempt_at 
      END,
      last_attempt_at = now(),
      locked_until = CASE 
        WHEN (CASE 
          WHEN security_rate_limits.first_attempt_at < now() - interval '1 hour' THEN 1 
          ELSE security_rate_limits.attempt_count + 1 
        END) >= v_max_attempts 
        THEN now() + (v_lockout_minutes || ' minutes')::interval 
        ELSE NULL 
      END
    RETURNING attempt_count INTO v_attempt_count;
    
    -- Log failed attempt
    INSERT INTO activity_logs (user_id, action_type, description)
    VALUES (v_user_id, 'PIN_FAILED', 'Failed PIN verification attempt #' || v_attempt_count);
    
    IF v_attempt_count >= v_max_attempts THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'Too many failed attempts. Account locked for ' || v_lockout_minutes || ' minutes.',
        'attempts_remaining', 0
      );
    ELSE
      RETURN json_build_object(
        'success', false, 
        'error', 'Invalid PIN',
        'attempts_remaining', v_max_attempts - v_attempt_count
      );
    END IF;
  END IF;
END;
$$;

-- Create function for rate-limited transfers
CREATE OR REPLACE FUNCTION public.process_transfer_secure(
  p_recipient_id UUID, 
  p_amount NUMERIC, 
  p_description TEXT DEFAULT NULL,
  p_pin TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_pin_required BOOLEAN;
  v_stored_pin_hash TEXT;
  v_computed_pin_hash TEXT;
  v_transfer_count INTEGER;
  v_max_transfers_per_hour INTEGER := 20;
  v_pin_result JSON;
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
  
  -- Validate amount is positive and reasonable
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  IF p_amount > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Amount exceeds maximum transfer limit');
  END IF;
  
  -- Rate limiting: check transfer frequency
  SELECT COUNT(*) INTO v_transfer_count
  FROM transactions
  WHERE sender_id = v_sender_id 
    AND created_at > now() - interval '1 hour';
  
  IF v_transfer_count >= v_max_transfers_per_hour THEN
    RETURN json_build_object('success', false, 'error', 'Transfer rate limit exceeded. Please wait before making more transfers.');
  END IF;
  
  -- Check if PIN verification is required
  SELECT pin_enabled, pin_hash INTO v_pin_required, v_stored_pin_hash
  FROM profiles
  WHERE user_id = v_sender_id;
  
  IF v_pin_required AND v_stored_pin_hash IS NOT NULL THEN
    IF p_pin IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'PIN required', 'pin_required', true);
    END IF;
    
    -- Verify PIN server-side
    v_pin_result := verify_transaction_pin(p_pin);
    IF NOT (v_pin_result->>'success')::boolean THEN
      RETURN v_pin_result;
    END IF;
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
$$;

-- Add encryption column for API keys (we'll encrypt values at application level)
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS encrypted_key_value TEXT;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS encryption_iv TEXT;

-- Create function to verify wallet PIN server-side
CREATE OR REPLACE FUNCTION public.verify_wallet_pin(p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_stored_hash TEXT;
  v_computed_hash TEXT;
  v_attempt_count INTEGER;
  v_locked_until TIMESTAMP WITH TIME ZONE;
  v_lockout_minutes INTEGER := 15;
  v_max_attempts INTEGER := 5;
BEGIN
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate PIN format (6 digits for wallet PIN)
  IF p_pin IS NULL OR length(p_pin) != 6 OR p_pin !~ '^\d{6}$' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid PIN format');
  END IF;
  
  -- Check rate limiting
  SELECT attempt_count, locked_until 
  INTO v_attempt_count, v_locked_until
  FROM security_rate_limits
  WHERE user_id = v_user_id AND action_type = 'wallet_pin_verification'
  FOR UPDATE;
  
  -- Check if locked out
  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Too many failed attempts. Try again later.',
      'locked_until', v_locked_until
    );
  END IF;
  
  -- Get stored wallet PIN hash from wallet_vault
  SELECT wallet_pin_hash INTO v_stored_hash
  FROM wallet_vault
  WHERE user_id = v_user_id;
  
  IF v_stored_hash IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet PIN not set');
  END IF;
  
  -- Compute hash server-side (same algorithm as client: pin + userId + "wallet_security")
  SELECT encode(digest(p_pin || v_user_id::text || 'wallet_security', 'sha256'), 'hex') INTO v_computed_hash;
  
  -- Verify PIN
  IF v_computed_hash = v_stored_hash THEN
    -- Success: clear rate limiting
    DELETE FROM security_rate_limits 
    WHERE user_id = v_user_id AND action_type = 'wallet_pin_verification';
    
    -- Log successful verification
    INSERT INTO activity_logs (user_id, action_type, description)
    VALUES (v_user_id, 'WALLET_PIN_VERIFIED', 'Wallet PIN verified successfully');
    
    RETURN json_build_object('success', true);
  ELSE
    -- Failed: update rate limiting
    INSERT INTO security_rate_limits (user_id, action_type, attempt_count, first_attempt_at, last_attempt_at, locked_until)
    VALUES (
      v_user_id, 
      'wallet_pin_verification', 
      1, 
      now(), 
      now(),
      CASE WHEN 1 >= v_max_attempts THEN now() + (v_lockout_minutes || ' minutes')::interval ELSE NULL END
    )
    ON CONFLICT (user_id, action_type) DO UPDATE SET
      attempt_count = CASE 
        WHEN security_rate_limits.first_attempt_at < now() - interval '1 hour' THEN 1 
        ELSE security_rate_limits.attempt_count + 1 
      END,
      first_attempt_at = CASE 
        WHEN security_rate_limits.first_attempt_at < now() - interval '1 hour' THEN now() 
        ELSE security_rate_limits.first_attempt_at 
      END,
      last_attempt_at = now(),
      locked_until = CASE 
        WHEN (CASE 
          WHEN security_rate_limits.first_attempt_at < now() - interval '1 hour' THEN 1 
          ELSE security_rate_limits.attempt_count + 1 
        END) >= v_max_attempts 
        THEN now() + (v_lockout_minutes || ' minutes')::interval 
        ELSE NULL 
      END
    RETURNING attempt_count INTO v_attempt_count;
    
    -- Log failed attempt
    INSERT INTO activity_logs (user_id, action_type, description)
    VALUES (v_user_id, 'WALLET_PIN_FAILED', 'Failed wallet PIN verification attempt #' || v_attempt_count);
    
    IF v_attempt_count >= v_max_attempts THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'Too many failed attempts. Account locked for ' || v_lockout_minutes || ' minutes.',
        'attempts_remaining', 0
      );
    ELSE
      RETURN json_build_object(
        'success', false, 
        'error', 'Invalid PIN',
        'attempts_remaining', v_max_attempts - v_attempt_count
      );
    END IF;
  END IF;
END;
$$;