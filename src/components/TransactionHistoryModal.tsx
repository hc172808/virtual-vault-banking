import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Calendar,
  DollarSign,
  Search,
  Download,
  FileText
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TransactionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface Transaction {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  amount?: number;
  type?: 'credit' | 'debit';
}

const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  open,
  onOpenChange,
  userId,
}) => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    if (open) {
      loadTransactions();
    }
  }, [open, userId]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Parse transactions and extract amounts
      const parsedTransactions = data.map(log => {
        const transaction: Transaction = {
          id: log.id,
          action_type: log.action_type,
          description: log.description,
          created_at: log.created_at,
        };

        // Extract amount from description if it contains money operations
        const amountMatch = log.description.match(/\$(\d+\.?\d*)/);
        if (amountMatch) {
          transaction.amount = parseFloat(amountMatch[1]);
          
          // Determine transaction type based on action
          if (log.action_type.includes('SENT') || log.action_type.includes('WITHDRAW')) {
            transaction.type = 'debit';
          } else if (log.action_type.includes('RECEIVED') || log.action_type.includes('DEPOSIT') || log.action_type.includes('ADD')) {
            transaction.type = 'credit';
          }
        }

        return transaction;
      });

      setTransactions(parsedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'credit' && transaction.type !== 'credit') return false;
      if (filterType === 'debit' && transaction.type !== 'debit') return false;
      if (filterType === 'transfers' && !transaction.action_type.includes('MONEY')) return false;
    }

    // Date range filter
    if (dateRange !== 'all') {
      const transactionDate = new Date(transaction.created_at);
      const now = new Date();
      
      switch (dateRange) {
        case '7days':
          if (transactionDate < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) return false;
          break;
        case '30days':
          if (transactionDate < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) return false;
          break;
        case '90days':
          if (transactionDate < new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)) return false;
          break;
      }
    }

    return true;
  });

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'credit') {
      return <ArrowDownLeft className="w-4 h-4 text-success" />;
    } else if (transaction.type === 'debit') {
      return <ArrowUpRight className="w-4 h-4 text-destructive" />;
    }
    return <DollarSign className="w-4 h-4 text-muted-foreground" />;
  };

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.type === 'credit') return 'text-success';
    if (transaction.type === 'debit') return 'text-destructive';
    return '';
  };

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Type,Description,Amount\n"
      + filteredTransactions.map(t => 
          `${new Date(t.created_at).toLocaleDateString()},${t.action_type},"${t.description}",${t.amount || 0}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transaction_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: "CSV exported successfully",
    });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Transaction History", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Summary
    const totalIn = filteredTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalOut = filteredTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(`Total Transactions: ${filteredTransactions.length}`, 14, 42);
    doc.setTextColor(34, 139, 34);
    doc.text(`Money In: $${totalIn.toFixed(2)}`, 14, 50);
    doc.setTextColor(220, 53, 69);
    doc.text(`Money Out: $${totalOut.toFixed(2)}`, 14, 58);
    
    // Table
    const tableData = filteredTransactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.action_type.replace(/_/g, ' '),
      t.description.substring(0, 40) + (t.description.length > 40 ? '...' : ''),
      t.type === 'debit' ? `-$${t.amount?.toFixed(2) || '0.00'}` : `+$${t.amount?.toFixed(2) || '0.00'}`
    ]);
    
    autoTable(doc, {
      head: [['Date', 'Type', 'Description', 'Amount']],
      body: tableData,
      startY: 66,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    doc.save('transaction_history.pdf');
    
    toast({
      title: "Export Complete",
      description: "PDF exported successfully",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            Transaction History
          </DialogTitle>
          <DialogDescription>
            View and manage your account activity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search transactions..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Transaction Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="credit">Money In</SelectItem>
                      <SelectItem value="debit">Money Out</SelectItem>
                      <SelectItem value="transfers">Transfers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="90days">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={exportCSV}
                    className="flex-1"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportPDF}
                    className="flex-1"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold">{filteredTransactions.length}</p>
                  </div>
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Money In</p>
                    <p className="text-2xl font-bold text-success">
                      ${filteredTransactions
                        .filter(t => t.type === 'credit')
                        .reduce((sum, t) => sum + (t.amount || 0), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <ArrowDownLeft className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Money Out</p>
                    <p className="text-2xl font-bold text-destructive">
                      ${filteredTransactions
                        .filter(t => t.type === 'debit')
                        .reduce((sum, t) => sum + (t.amount || 0), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <ArrowUpRight className="w-8 h-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="p-4 space-y-2">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading transactions...</p>
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No transactions found</p>
                    </div>
                  ) : (
                    filteredTransactions.map((transaction, index) => (
                      <div key={transaction.id}>
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getTransactionIcon(transaction)}
                            <div>
                              <p className="font-medium text-sm">
                                {transaction.action_type.replace(/_/g, ' ').toLowerCase()
                                  .replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {transaction.amount && (
                              <p className={`font-semibold ${getTransactionColor(transaction)}`}>
                                {transaction.type === 'debit' ? '-' : '+'}${transaction.amount.toFixed(2)}
                              </p>
                            )}
                            <Badge 
                              variant={transaction.type === 'credit' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {transaction.type || 'activity'}
                            </Badge>
                          </div>
                        </div>
                        {index < filteredTransactions.length - 1 && <Separator />}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionHistoryModal;