-- Add foreign key constraint to fund_logs table to link to profiles
-- This will allow proper joins between fund_logs and profiles tables

-- We need to reference the user_id column in profiles table
ALTER TABLE public.fund_logs 
ADD CONSTRAINT fund_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id);