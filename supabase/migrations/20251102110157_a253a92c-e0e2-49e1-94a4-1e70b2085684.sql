-- Create blockchain-level security with separate roles table
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'client');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Create transactions table with fees
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  transaction_type TEXT NOT NULL DEFAULT 'transfer',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CHECK (amount > 0),
  CHECK (fee >= 0)
);

-- 6. Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 7. Create system settings table for admin-configurable fees
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- 8. Insert default transaction fee settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('transfer_fee_percentage', '0.5', 'Percentage fee for transfers between users'),
  ('transfer_fee_fixed', '0.00', 'Fixed fee for transfers between users'),
  ('min_transfer_amount', '1.00', 'Minimum transfer amount'),
  ('max_transfer_amount', '10000.00', 'Maximum transfer amount per transaction');

-- 9. Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 11. RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 12. RLS Policies for system_settings
CREATE POLICY "Everyone can view system settings"
  ON public.system_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify system settings"
  ON public.system_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 13. Function to process transaction with fees
CREATE OR REPLACE FUNCTION public.process_transfer(
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_sender_balance NUMERIC;
  v_fee_percentage NUMERIC;
  v_fee_fixed NUMERIC;
  v_total_fee NUMERIC;
  v_total_amount NUMERIC;
  v_transaction_id UUID;
BEGIN
  v_sender_id := auth.uid();
  
  -- Get fee settings
  SELECT CAST(setting_value AS NUMERIC) INTO v_fee_percentage 
  FROM system_settings WHERE setting_key = 'transfer_fee_percentage';
  
  SELECT CAST(setting_value AS NUMERIC) INTO v_fee_fixed 
  FROM system_settings WHERE setting_key = 'transfer_fee_fixed';
  
  -- Calculate fees
  v_total_fee := (p_amount * v_fee_percentage / 100) + v_fee_fixed;
  v_total_amount := p_amount + v_total_fee;
  
  -- Get sender balance
  SELECT balance INTO v_sender_balance FROM profiles WHERE user_id = v_sender_id;
  
  -- Check sufficient balance
  IF v_sender_balance < v_total_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;
  
  -- Update balances
  UPDATE profiles SET balance = balance - v_total_amount WHERE user_id = v_sender_id;
  UPDATE profiles SET balance = balance + p_amount WHERE user_id = p_recipient_id;
  
  -- Create transaction record
  INSERT INTO transactions (sender_id, recipient_id, amount, fee, total_amount, description)
  VALUES (v_sender_id, p_recipient_id, p_amount, v_total_fee, v_total_amount, p_description)
  RETURNING id INTO v_transaction_id;
  
  -- Log activity
  INSERT INTO activity_logs (user_id, action_type, description)
  VALUES (v_sender_id, 'TRANSFER_SENT', 'Sent $' || p_amount || ' (fee: $' || v_total_fee || ')');
  
  INSERT INTO activity_logs (user_id, action_type, description)
  VALUES (p_recipient_id, 'TRANSFER_RECEIVED', 'Received $' || p_amount);
  
  RETURN json_build_object(
    'success', true, 
    'transaction_id', v_transaction_id,
    'amount', p_amount,
    'fee', v_total_fee,
    'total', v_total_amount
  );
END;
$$;