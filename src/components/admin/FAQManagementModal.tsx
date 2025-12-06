import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";

interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
}

interface FAQManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  "Getting Started",
  "Account Management", 
  "Transactions",
  "Security",
  "Fees & Limits",
  "Technical Support",
];

const FAQManagementModal: React.FC<FAQManagementModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "Getting Started",
    is_published: true,
  });

  useEffect(() => {
    if (open) {
      loadFaqs();
    }
  }, [open]);

  const loadFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error("Error loading FAQs:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.question || !formData.answer) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingFaq) {
        const { error } = await supabase
          .from("knowledge_base")
          .update({
            question: formData.question,
            answer: formData.answer,
            category: formData.category,
            is_published: formData.is_published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingFaq.id);

        if (error) throw error;
        toast({ title: "FAQ Updated", description: "Article has been updated successfully" });
      } else {
        const { error } = await supabase.from("knowledge_base").insert([
          {
            question: formData.question,
            answer: formData.answer,
            category: formData.category,
            is_published: formData.is_published,
          },
        ]);

        if (error) throw error;
        toast({ title: "FAQ Created", description: "New article has been created successfully" });
      }

      resetForm();
      loadFaqs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save FAQ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (faq: FAQEntry) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      is_published: faq.is_published,
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    try {
      const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "FAQ Deleted", description: "Article has been deleted successfully" });
      loadFaqs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete FAQ",
        variant: "destructive",
      });
    }
  };

  const togglePublish = async (faq: FAQEntry) => {
    try {
      const { error } = await supabase
        .from("knowledge_base")
        .update({ is_published: !faq.is_published })
        .eq("id", faq.id);

      if (error) throw error;
      loadFaqs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update publish status",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ question: "", answer: "", category: "Getting Started", is_published: true });
    setEditingFaq(null);
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            FAQ Management
          </DialogTitle>
          <DialogDescription>Create, edit, and manage knowledge base articles</DialogDescription>
        </DialogHeader>

        {isCreating ? (
          <Card>
            <CardHeader>
              <CardTitle>{editingFaq ? "Edit FAQ" : "Create New FAQ"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="question">Question *</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter the question..."
                />
              </div>

              <div>
                <Label htmlFor="answer">Answer *</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
                  placeholder="Enter the answer..."
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-6">
                  <Label htmlFor="is_published">Published</Label>
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_published: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Saving..." : editingFaq ? "Update FAQ" : "Create FAQ"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-end">
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add New FAQ
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqs.map((faq) => (
                  <TableRow key={faq.id}>
                    <TableCell className="max-w-xs truncate">{faq.question}</TableCell>
                    <TableCell>{faq.category}</TableCell>
                    <TableCell>{faq.view_count}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublish(faq)}
                        className={faq.is_published ? "text-green-600" : "text-muted-foreground"}
                      >
                        {faq.is_published ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(faq)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(faq.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {faqs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No FAQs found. Click "Add New FAQ" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FAQManagementModal;
