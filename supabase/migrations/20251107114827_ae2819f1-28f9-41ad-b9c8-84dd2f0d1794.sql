-- Create PWA settings table for admin customization
CREATE TABLE IF NOT EXISTS public.pwa_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pwa_settings ENABLE ROW LEVEL SECURITY;

-- Policies for PWA settings
CREATE POLICY "Everyone can view enabled PWA settings"
  ON public.pwa_settings
  FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins can manage PWA settings"
  ON public.pwa_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create payment requests table
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  recipient_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Policies for payment requests
CREATE POLICY "Users can view their own payment requests"
  ON public.payment_requests
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create payment requests"
  ON public.payment_requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update payment requests"
  ON public.payment_requests
  FOR UPDATE
  USING (auth.uid() = recipient_id AND status = 'pending');

CREATE POLICY "Admins can view all payment requests"
  ON public.payment_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_payment_requests_sender ON public.payment_requests(sender_id);
CREATE INDEX idx_payment_requests_recipient ON public.payment_requests(recipient_id);
CREATE INDEX idx_payment_requests_status ON public.payment_requests(status);

-- Enable realtime for payment requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_requests_updated_at();

-- Insert default PWA settings
INSERT INTO public.pwa_settings (setting_key, setting_value, enabled) VALUES
  ('shortcuts', '[]'::jsonb, true),
  ('features', '{"installable": true, "offline": true, "notifications": true}'::jsonb, true)
ON CONFLICT (setting_key) DO NOTHING;