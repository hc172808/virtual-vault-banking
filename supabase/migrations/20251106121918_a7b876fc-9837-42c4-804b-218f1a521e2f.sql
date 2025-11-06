-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Create a security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Now create the correct policies using the function
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id) OR public.is_admin()
);

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  (auth.uid() = user_id) OR public.is_admin()
);