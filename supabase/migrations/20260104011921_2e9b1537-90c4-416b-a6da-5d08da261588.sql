
-- Create a secure wallet vault table for sensitive wallet credentials
CREATE TABLE public.wallet_vault (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  encrypted_private_key TEXT,
  wallet_pin_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.wallet_vault ENABLE ROW LEVEL SECURITY;

-- Create very restrictive RLS policies - users can only access their own vault
-- No admin access to sensitive wallet credentials
CREATE POLICY "Users can view their own wallet vault"
ON public.wallet_vault
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet vault"
ON public.wallet_vault
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet vault"
ON public.wallet_vault
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_wallet_vault_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_wallet_vault_updated_at
BEFORE UPDATE ON public.wallet_vault
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_vault_updated_at();

-- Migrate existing wallet credentials to the vault
INSERT INTO public.wallet_vault (user_id, encrypted_private_key, wallet_pin_hash)
SELECT user_id, encrypted_private_key, wallet_pin_hash
FROM public.profiles
WHERE encrypted_private_key IS NOT NULL OR wallet_pin_hash IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  encrypted_private_key = EXCLUDED.encrypted_private_key,
  wallet_pin_hash = EXCLUDED.wallet_pin_hash;

-- Remove sensitive columns from profiles table (keep wallet_address and public_key as they are public)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS encrypted_private_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS wallet_pin_hash;
