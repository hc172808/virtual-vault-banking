-- Create FAQ/Knowledge Base table
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Everyone can view published FAQs
CREATE POLICY "Everyone can view published FAQs"
ON public.knowledge_base FOR SELECT
USING (is_published = true);

-- Admins can manage FAQs
CREATE POLICY "Admins can manage FAQs"
ON public.knowledge_base FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create live chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_agent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view their own conversations"
ON public.chat_conversations FOR SELECT
USING (auth.uid() = user_id);

-- Users can create conversations
CREATE POLICY "Users can create conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Agents can view all conversations
CREATE POLICY "Agents can view all conversations"
ON public.chat_conversations FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

-- Agents can update conversations
CREATE POLICY "Agents can update conversations"
ON public.chat_conversations FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

-- Users can view messages in their conversations
CREATE POLICY "Users can view their messages"
ON public.chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations 
  WHERE id = conversation_id AND user_id = auth.uid()
));

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_conversations 
  WHERE id = conversation_id AND user_id = auth.uid()
));

-- Agents can view all messages
CREATE POLICY "Agents can view all messages"
ON public.chat_messages FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

-- Agents can send messages
CREATE POLICY "Agents can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

-- Add card_cvv column to profiles for user's custom CVV
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS card_cvv TEXT DEFAULT '123';

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

-- Insert sample FAQ data
INSERT INTO public.knowledge_base (category, question, answer) VALUES
('Account', 'How do I reset my password?', 'Go to the login page and click "Forgot Password". Enter your email address and we will send you a link to reset your password.'),
('Account', 'How do I update my profile information?', 'Navigate to Account Settings from the menu, then click on Manage Profile to update your personal information.'),
('Transfers', 'How long do transfers take?', 'Internal transfers between StableCoin accounts are instant. External transfers may take 1-3 business days depending on the destination.'),
('Transfers', 'What are the transfer fees?', 'Transfer fees vary based on the amount and type of transfer. You can view the current fee structure in System Settings or contact support for details.'),
('Transfers', 'What is the maximum transfer limit?', 'Daily transfer limits depend on your account verification level. Fully verified accounts can transfer up to $50,000 per day.'),
('Security', 'How do I enable PIN protection?', 'Go to PIN Settings from the navigation menu. You can enable PIN protection and set a 4-digit PIN for transaction security.'),
('Security', 'Is my money safe?', 'Yes! We use bank-level encryption and security measures. All funds are backed by our GYD stablecoin reserves.'),
('Cards', 'How do I view my card details?', 'Click on "Card Details" in the navigation menu to view your virtual card number, expiry date, and CVV.'),
('Cards', 'Can I change my CVV?', 'Yes, you can change your CVV in the Card Details section. Click on the edit button next to the CVV field.');