import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, BookOpen, Loader2 } from "lucide-react";

interface KnowledgeBaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  view_count: number;
}

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ open, onOpenChange }) => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (open) {
      fetchFAQs();
    }
  }, [open]);

  const fetchFAQs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('is_published', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async (id: string) => {
    await supabase
      .from('knowledge_base')
      .update({ view_count: faqs.find(f => f.id === id)?.view_count ?? 0 + 1 })
      .eq('id', id);
  };

  const categories = Array.from(new Set(faqs.map(f => f.category)));

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Knowledge Base & FAQs
          </DialogTitle>
          <DialogDescription>
            Find answers to common questions before creating a support ticket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background min-w-[120px]"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Category Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Badge>
            {categories.map(cat => (
              <Badge 
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {/* FAQ List */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredFAQs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No FAQs found matching your search
              </div>
            ) : (
              Object.entries(groupedFAQs).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">
                    {category}
                  </h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {items.map((faq) => (
                      <AccordionItem 
                        key={faq.id} 
                        value={faq.id}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger 
                          className="text-left hover:no-underline"
                          onClick={() => incrementViewCount(faq.id)}
                        >
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KnowledgeBaseModal;
