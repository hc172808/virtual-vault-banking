-- Create Bank/Treasury table for unlimited internal funds
CREATE TABLE public.bank_treasury (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Central Bank',
  description TEXT,
  balance NUMERIC NOT NULL DEFAULT 999999999999.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default treasury
INSERT INTO public.bank_treasury (name, description) 
VALUES ('Central Bank', 'System treasury with unlimited funds for admin operations');

-- Create admin withdrawals from treasury tracking
CREATE TABLE public.treasury_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treasury_id UUID NOT NULL REFERENCES public.bank_treasury(id),
  admin_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  chain_id TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chain ID tracking for all admin-originated funds
CREATE TABLE public.fund_chain_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id TEXT NOT NULL,
  parent_chain_id TEXT,
  transaction_id UUID,
  fund_log_id UUID,
  source_type TEXT NOT NULL CHECK (source_type IN ('treasury_withdrawal', 'admin_transfer', 'user_transfer')),
  source_user_id UUID,
  destination_user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL,
  CONSTRAINT fk_fund_log FOREIGN KEY (fund_log_id) REFERENCES public.fund_logs(id) ON DELETE SET NULL
);

-- Create index for chain verification
CREATE INDEX idx_fund_chain_tracking_chain_id ON public.fund_chain_tracking(chain_id);
CREATE INDEX idx_fund_chain_tracking_destination ON public.fund_chain_tracking(destination_user_id);

-- Add transaction limit settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('high_value_threshold', '1000.00', 'Transaction amount requiring additional verification'),
  ('high_value_verification_required', 'true', 'Whether high-value transactions require extra verification');

-- Add push notification settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('push_notifications_enabled', 'true', 'Enable push notifications for transactions');

-- Enable RLS on new tables
ALTER TABLE public.bank_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_chain_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_treasury (admin only)
CREATE POLICY "Only admins can view treasury"
  ON public.bank_treasury
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Only admins can update treasury"
  ON public.bank_treasury
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- RLS Policies for treasury_withdrawals (admin only)
CREATE POLICY "Only admins can view treasury withdrawals"
  ON public.treasury_withdrawals
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Only admins can insert treasury withdrawals"
  ON public.treasury_withdrawals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- RLS Policies for fund_chain_tracking
CREATE POLICY "Admins can view all chain tracking"
  ON public.fund_chain_tracking
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can view their own chain tracking"
  ON public.fund_chain_tracking
  FOR SELECT
  TO authenticated
  USING (destination_user_id = auth.uid());

CREATE POLICY "Only admins can insert chain tracking"
  ON public.fund_chain_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Function to generate unique chain ID
CREATE OR REPLACE FUNCTION public.generate_chain_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_chain_id TEXT;
BEGIN
  -- Generate format: CHN-YYYYMMDD-RANDOMHEX
  v_chain_id := 'CHN-' || to_char(now(), 'YYYYMMDD') || '-' || 
                upper(substring(encode(gen_random_bytes(8), 'hex') from 1 for 12));
  RETURN v_chain_id;
END;
$$;

-- Function for admin to withdraw from treasury
CREATE OR REPLACE FUNCTION public.withdraw_from_treasury(
  p_amount NUMERIC,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_treasury_id UUID;
  v_chain_id TEXT;
  v_admin_balance NUMERIC;
BEGIN
  v_admin_id := auth.uid();
  
  -- Verify admin status
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can withdraw from treasury');
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  -- Get treasury
  SELECT id INTO v_treasury_id FROM bank_treasury WHERE is_active = true LIMIT 1;
  IF v_treasury_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active treasury found');
  END IF;
  
  -- Generate chain ID
  v_chain_id := generate_chain_id();
  
  -- Record withdrawal
  INSERT INTO treasury_withdrawals (treasury_id, admin_id, amount, chain_id, reason)
  VALUES (v_treasury_id, v_admin_id, p_amount, v_chain_id, p_reason);
  
  -- Get current admin balance
  SELECT balance INTO v_admin_balance FROM profiles WHERE user_id = v_admin_id FOR UPDATE;
  
  -- Add to admin balance
  UPDATE profiles SET balance = COALESCE(balance, 0) + p_amount WHERE user_id = v_admin_id;
  
  -- Track the chain
  INSERT INTO fund_chain_tracking (chain_id, source_type, destination_user_id, amount)
  VALUES (v_chain_id, 'treasury_withdrawal', v_admin_id, p_amount);
  
  -- Log activity
  INSERT INTO activity_logs (user_id, action_type, description)
  VALUES (v_admin_id, 'TREASURY_WITHDRAWAL', 'Withdrew $' || p_amount || ' from treasury. Chain ID: ' || v_chain_id);
  
  RETURN json_build_object(
    'success', true, 
    'chain_id', v_chain_id,
    'new_balance', v_admin_balance + p_amount
  );
END;
$$;

-- Function for admin to transfer funds with chain ID tracking
CREATE OR REPLACE FUNCTION public.admin_transfer_with_chain(
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_parent_chain_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_balance NUMERIC;
  v_recipient_balance NUMERIC;
  v_chain_id TEXT;
  v_transaction_id UUID;
  v_fund_log_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Verify admin status
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can use this function');
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  -- Validate parent chain ID if provided
  IF p_parent_chain_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM fund_chain_tracking WHERE chain_id = p_parent_chain_id AND is_verified = true) THEN
      RETURN json_build_object('success', false, 'error', 'Invalid or unverified parent chain ID. Funds rejected.');
    END IF;
  END IF;
  
  -- Get admin balance
  SELECT balance INTO v_admin_balance FROM profiles WHERE user_id = v_admin_id FOR UPDATE;
  
  IF v_admin_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient admin balance');
  END IF;
  
  -- Get recipient balance
  SELECT balance INTO v_recipient_balance FROM profiles WHERE user_id = p_recipient_id FOR UPDATE;
  
  IF v_recipient_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;
  
  -- Generate new chain ID
  v_chain_id := generate_chain_id();
  
  -- Deduct from admin
  UPDATE profiles SET balance = balance - p_amount WHERE user_id = v_admin_id;
  
  -- Add to recipient
  UPDATE profiles SET balance = balance + p_amount WHERE user_id = p_recipient_id;
  
  -- Create transaction record
  INSERT INTO transactions (sender_id, recipient_id, amount, total_amount, fee, description, transaction_type, status)
  VALUES (v_admin_id, p_recipient_id, p_amount, p_amount, 0, COALESCE(p_description, 'Admin transfer') || ' [Chain: ' || v_chain_id || ']', 'admin_transfer', 'completed')
  RETURNING id INTO v_transaction_id;
  
  -- Log fund operation
  INSERT INTO fund_logs (user_id, admin_id, amount, type, reason, balance_before, balance_after)
  VALUES (p_recipient_id, v_admin_id, p_amount, 'ADD', COALESCE(p_description, 'Admin transfer') || ' [Chain: ' || v_chain_id || ']', v_recipient_balance, v_recipient_balance + p_amount)
  RETURNING id INTO v_fund_log_id;
  
  -- Track the chain
  INSERT INTO fund_chain_tracking (chain_id, parent_chain_id, transaction_id, fund_log_id, source_type, source_user_id, destination_user_id, amount)
  VALUES (v_chain_id, p_parent_chain_id, v_transaction_id, v_fund_log_id, 'admin_transfer', v_admin_id, p_recipient_id, p_amount);
  
  -- Log activity
  INSERT INTO activity_logs (user_id, action_type, description)
  VALUES (v_admin_id, 'ADMIN_TRANSFER', 'Transferred $' || p_amount || ' to user. Chain ID: ' || v_chain_id);
  
  INSERT INTO activity_logs (user_id, action_type, description)
  VALUES (p_recipient_id, 'FUND_RECEIVED', 'Received $' || p_amount || ' from admin. Chain ID: ' || v_chain_id);
  
  RETURN json_build_object(
    'success', true, 
    'chain_id', v_chain_id,
    'transaction_id', v_transaction_id
  );
END;
$$;

-- Function to verify chain ID for transfers
CREATE OR REPLACE FUNCTION public.verify_fund_chain(p_chain_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chain_record RECORD;
BEGIN
  SELECT * INTO v_chain_record FROM fund_chain_tracking WHERE chain_id = p_chain_id;
  
  IF v_chain_record IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Chain ID not found');
  END IF;
  
  IF NOT v_chain_record.is_verified THEN
    RETURN json_build_object('valid', false, 'error', 'Chain ID is not verified');
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'chain_id', v_chain_record.chain_id,
    'source_type', v_chain_record.source_type,
    'amount', v_chain_record.amount,
    'created_at', v_chain_record.created_at
  );
END;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.fund_chain_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.treasury_withdrawals;