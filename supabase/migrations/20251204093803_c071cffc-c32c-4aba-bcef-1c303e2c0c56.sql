-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support_ticket_responses table
CREATE TABLE public.support_ticket_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_agent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_tickets
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and agents can view all tickets"
ON public.support_tickets FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

CREATE POLICY "Admins and agents can update tickets"
ON public.support_tickets FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

-- RLS policies for support_ticket_responses
CREATE POLICY "Users can view responses on their tickets"
ON public.support_ticket_responses FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.support_tickets 
  WHERE id = ticket_id AND user_id = auth.uid()
));

CREATE POLICY "Admins and agents can view all responses"
ON public.support_ticket_responses FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

CREATE POLICY "Admins and agents can insert responses"
ON public.support_ticket_responses FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

CREATE POLICY "Users can insert responses on their tickets"
ON public.support_ticket_responses FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.support_tickets 
  WHERE id = ticket_id AND user_id = auth.uid()
));

-- Enable realtime for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Update trigger for support_tickets
CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_support_ticket_updated_at();