
-- Drop the overly permissive public access policy
DROP POLICY IF EXISTS "Everyone can view system settings" ON public.system_settings;

-- Create new policy that restricts access to authenticated users only
CREATE POLICY "Authenticated users can view system settings"
ON public.system_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);
