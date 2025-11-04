-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create firewall_rules table
CREATE TABLE IF NOT EXISTS public.firewall_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('ip_whitelist', 'ip_blacklist', 'country_whitelist', 'country_blacklist', 'rate_limit')),
  rule_value TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.firewall_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for firewall_rules
CREATE POLICY "Admins can view all firewall rules"
ON public.firewall_rules FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert firewall rules"
ON public.firewall_rules FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update firewall rules"
ON public.firewall_rules FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete firewall rules"
ON public.firewall_rules FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add missing fee settings if they don't exist
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('withdrawal_fee_percentage', '1.0', 'Withdrawal fee percentage'),
  ('withdrawal_fee_fixed', '0.50', 'Fixed withdrawal fee'),
  ('deposit_fee_percentage', '0.0', 'Deposit fee percentage'),
  ('deposit_fee_fixed', '0.00', 'Fixed deposit fee')
ON CONFLICT (setting_key) DO NOTHING;