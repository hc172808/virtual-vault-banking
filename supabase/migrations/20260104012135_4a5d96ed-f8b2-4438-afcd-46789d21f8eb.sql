
-- Fix wallet_vault policies to require authentication
DROP POLICY IF EXISTS "Users can view their own wallet vault" ON public.wallet_vault;
DROP POLICY IF EXISTS "Users can update their own wallet vault" ON public.wallet_vault;
DROP POLICY IF EXISTS "Users can insert their own wallet vault" ON public.wallet_vault;

-- Recreate with explicit authenticated role
CREATE POLICY "Authenticated users can view their own wallet vault"
ON public.wallet_vault
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own wallet vault"
ON public.wallet_vault
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own wallet vault"
ON public.wallet_vault
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
