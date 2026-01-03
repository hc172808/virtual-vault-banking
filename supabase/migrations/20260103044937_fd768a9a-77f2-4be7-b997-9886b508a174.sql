-- Add wallet_pin_hash column to profiles for wallet security
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_pin_hash text;