-- Fix profiles table RLS to prevent sensitive data exposure
-- The current policies allow any authenticated user to view admin profiles
-- which could expose sensitive financial and identity data

-- Drop existing policies that allow cross-user access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Create stricter policies for admin access using the has_role function
-- Admins can view all profiles but only through the secure function
CREATE POLICY "Admins can view all profiles secure" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update any profile but only through the secure function
CREATE POLICY "Admins can update any profile secure" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Also fix activity_logs to use has_role instead of querying profiles table
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "All users can insert their own activity logs" ON public.activity_logs;

CREATE POLICY "Admins agents can view all activity logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

CREATE POLICY "Authenticated users can insert activity logs" 
ON public.activity_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Fix announcements to use has_role function
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;

CREATE POLICY "Admins can delete announcements secure" 
ON public.announcements 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert announcements secure" 
ON public.announcements 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update announcements secure" 
ON public.announcements 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix fund_logs to use has_role function
DROP POLICY IF EXISTS "Admins can insert fund logs" ON public.fund_logs;
DROP POLICY IF EXISTS "Admins can view all fund logs" ON public.fund_logs;

CREATE POLICY "Admins can insert fund logs secure" 
ON public.fund_logs 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all fund logs secure" 
ON public.fund_logs 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));