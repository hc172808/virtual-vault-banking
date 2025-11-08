import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Receipt, Clock, Users } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const AdminAnalyticsDashboard: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    senderFeeRevenue: 0,
    receiverFeeRevenue: 0,
    transactionCount: 0,
    paymentRequests: {
      pending: 0,
      accepted: 0,
      rejected: 0,
      total: 0
    },
    transactionVolume: [] as any[],
    feeBreakdown: [] as any[],
    userStats: {
      totalUsers: 0,
      activeUsers: 0
    }
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get fee settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'transfer_fee_percentage',
          'transfer_fee_fixed',
          'receiver_fee_percentage',
          'receiver_fee_fixed'
        ]);

      const settingsMap = new Map(
        settings?.map(s => [s.setting_key, parseFloat(s.setting_value)]) || []
      );

      // Get all transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // Calculate fee revenue
      let senderFeeRevenue = 0;
      let receiverFeeRevenue = 0;

      transactions?.forEach(tx => {
        const amount = parseFloat(tx.amount as any);
        const senderFeePercent = settingsMap.get('transfer_fee_percentage') || 0;
        const senderFeeFixed = settingsMap.get('transfer_fee_fixed') || 0;
        const receiverFeePercent = settingsMap.get('receiver_fee_percentage') || 0;
        const receiverFeeFixed = settingsMap.get('receiver_fee_fixed') || 0;

        senderFeeRevenue += (amount * senderFeePercent / 100) + senderFeeFixed;
        receiverFeeRevenue += (amount * receiverFeePercent / 100) + receiverFeeFixed;
      });

      // Get payment requests stats
      const { data: paymentRequests } = await supabase
        .from('payment_requests')
        .select('status');

      const requestStats = {
        pending: paymentRequests?.filter(r => r.status === 'pending').length || 0,
        accepted: paymentRequests?.filter(r => r.status === 'accepted').length || 0,
        rejected: paymentRequests?.filter(r => r.status === 'rejected').length || 0,
        total: paymentRequests?.length || 0
      };

      // Get user stats
      const { data: users } = await supabase
        .from('profiles')
        .select('user_id, created_at');

      // Group transactions by date for volume chart
      const volumeByDate = transactions?.reduce((acc: any, tx) => {
        const date = new Date(tx.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, amount: 0, count: 0 };
        }
        acc[date].amount += parseFloat(tx.amount as any);
        acc[date].count += 1;
        return acc;
      }, {});

      const transactionVolume = Object.values(volumeByDate || {}).slice(-7);

      // Fee breakdown for pie chart
      const feeBreakdown = [
        { name: 'Sender Fees', value: senderFeeRevenue },
        { name: 'Receiver Fees', value: receiverFeeRevenue }
      ];

      setAnalytics({
        totalRevenue: senderFeeRevenue + receiverFeeRevenue,
        senderFeeRevenue,
        receiverFeeRevenue,
        transactionCount: transactions?.length || 0,
        paymentRequests: requestStats,
        transactionVolume: transactionVolume as any[],
        feeBreakdown,
        userStats: {
          totalUsers: users?.length || 0,
          activeUsers: users?.filter(u => {
            const created = new Date(u.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return created > thirtyDaysAgo;
          }).length || 0
        }
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Fee Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From all transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.transactionCount}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.paymentRequests.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.userStats.activeUsers} active this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="revenue">Fee Revenue</TabsTrigger>
          <TabsTrigger value="volume">Transaction Volume</TabsTrigger>
          <TabsTrigger value="requests">Payment Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Revenue Breakdown</CardTitle>
              <CardDescription>Distribution of sender vs receiver fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.feeBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.feeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Sender Fees</p>
                      <p className="text-2xl font-bold">${analytics.senderFeeRevenue.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Receiver Fees</p>
                      <p className="text-2xl font-bold">${analytics.receiverFeeRevenue.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-success" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Volume (Last 7 Days)</CardTitle>
              <CardDescription>Daily transaction amounts and counts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.transactionVolume}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="amount" fill="hsl(var(--primary))" name="Amount ($)" />
                    <Bar yAxisId="right" dataKey="count" fill="hsl(var(--success))" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Request Statistics</CardTitle>
              <CardDescription>Overview of payment request statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Pending', value: analytics.paymentRequests.pending },
                          { name: 'Accepted', value: analytics.paymentRequests.accepted },
                          { name: 'Rejected', value: analytics.paymentRequests.rejected }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2].map((index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                      <p className="text-2xl font-bold">{analytics.paymentRequests.total}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending</span>
                      <span className="font-bold">{analytics.paymentRequests.pending}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Accepted</span>
                      <span className="font-bold text-success">{analytics.paymentRequests.accepted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Rejected</span>
                      <span className="font-bold text-destructive">{analytics.paymentRequests.rejected}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalyticsDashboard;
