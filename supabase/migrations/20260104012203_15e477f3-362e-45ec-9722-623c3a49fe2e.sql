
-- Drop ALL existing policies on wallet_vault (including newly created ones)
DROP POLICY IF EXISTS "Authenticated users can insert their own wallet vault" ON public.wallet_vault;
DROP POLICY IF EXISTS "Authenticated users can update their own wallet vault" ON public.wallet_vault;
DROP POLICY IF EXISTS "Authenticated users can view their own wallet vault" ON public.wallet_vault;
DROP POLICY IF EXISTS "Users can view their own wallet vault" ON public.wallet_vault;
DROP POLICY IF EXISTS "Users can update their own wallet vault" ON public.wallet_vault;
DROP POLICY IF EXISTS "Users can insert their own wallet vault" ON public.wallet_vault;

-- Recreate with explicit authenticated role requirement
CREATE POLICY "Auth users can view own wallet vault"
ON public.wallet_vault
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Auth users can update own wallet vault"
ON public.wallet_vault
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Auth users can insert own wallet vault"
ON public.wallet_vault
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
