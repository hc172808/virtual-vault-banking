-- Create fund_logs table for tracking admin fund operations
CREATE TABLE public.fund_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ADD', 'WITHDRAW')),
  reason TEXT NOT NULL,
  admin_id UUID NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fund_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for fund_logs
CREATE POLICY "Admins can view all fund logs" 
ON public.fund_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'ADMIN'
  )
);

CREATE POLICY "Admins can insert fund logs" 
ON public.fund_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'ADMIN'
  )
);

-- Create activity_logs table for system audit trail
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_logs
CREATE POLICY "Admins can view all activity logs" 
ON public.activity_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'AGENT')
  )
);

CREATE POLICY "All users can insert their own activity logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);