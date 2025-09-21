-- Add PIN columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN pin_enabled boolean DEFAULT false,
ADD COLUMN pin_hash text;