-- Create storage bucket for support ticket attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', false);

-- Create RLS policies for support attachments bucket
CREATE POLICY "Users can upload their own ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'support-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Agents can view all ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view all ticket attachments as agent"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments' AND has_role(auth.uid(), 'agent'));

-- Create support_ticket_attachments table
CREATE TABLE public.support_ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for attachments
CREATE POLICY "Users can view attachments on their tickets"
ON public.support_ticket_attachments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.support_tickets 
  WHERE id = ticket_id AND user_id = auth.uid()
));

CREATE POLICY "Users can insert attachments on their tickets"
ON public.support_ticket_attachments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.support_tickets 
  WHERE id = ticket_id AND user_id = auth.uid()
));

CREATE POLICY "Agents can view all attachments"
ON public.support_ticket_attachments FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));