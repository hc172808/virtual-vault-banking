-- Add wallet columns to profiles for blockchain private keys
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS encrypted_private_key text,
ADD COLUMN IF NOT EXISTS wallet_address text,
ADD COLUMN IF NOT EXISTS public_key text;

-- Create api_keys table for admin-managed API keys and RPC endpoints
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL,
  key_type text NOT NULL, -- 'blockchain_rpc', 'api_key', 'webhook', etc.
  key_value text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API keys
CREATE POLICY "Admins can manage API keys" ON public.api_keys
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_key_type ON public.api_keys(key_type);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);