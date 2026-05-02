import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, CreditCard, Clock, Eye } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from '@/lib/format';
import { Link } from 'react-router-dom';
import { getUserAccounts, getUserTransactions } from '@/lib/db';

type OverviewTx = {
  id: string;
  type: 'credit' | 'debit';
  name: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
};

export default function Overview() {
  const { user } = useAuth();

  const balanceQuery = useQuery({
    queryKey: ['balance', user?.userId],
    queryFn: async () => {
      if (!user?.userId) return 0;
      try {
        const accounts = await getUserAccounts(user.userId);
        if (!Array.isArray(accounts)) return 0;
        return accounts.reduce((s, a) => s + (Number(a.balance_cents || 0) / 100), 0);
      } catch (err) {
        console.error("Overview balance fetch failed:", err);
        return 0;
      }
    },
    enabled: !!user,
  });

  const txnsQuery = useQuery({
    queryKey: ['txns', user?.userId],
    queryFn: async () => {
      if (!user?.userId) return [];
      try {
        const txs = await getUserTransactions(user.userId);
        if (!Array.isArray(txs)) return [];
        return txs.slice(0, 5).map(tx => ({
          id: tx.id, type: tx.direction === 'credit' ? 'credit' as const : 'debit' as const,
          name: tx.description, amount: Number(tx.amount_cents || 0) / 100,
          currency: tx.currency, date: tx.created_at ? new Date(tx.created_at).toLocaleString() : 'N/A',
          status: tx.status,
        }));
      } catch (err) {
        console.error("Overview transactions fetch failed:", err);
        return [];
      }
    },
    enabled: !!user,
  });

  const bal = balanceQuery.data || 0;
  const txns = txnsQuery.data || [];

  return (
    <div className="space-y-6">
      <div><h2 className="text-3xl font-bold tracking-tight">Good morning</h2><p className="text-muted-foreground">Welcome back to your AgriBank account</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 bg-gradient-to-br from-green-600 to-emerald-700 text-white border-0">
          <CardHeader><CardTitle className="text-white opacity-90">Available Balance</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-bold mb-6">{fmtMoney(Math.round(bal * 100), 'EUR')}</div><div className="flex gap-2"><Button asChild className="bg-white text-green-700 hover:bg-gray-100"><Link to="/dashboard/transfers"><ArrowUpRight className="mr-2 h-4 w-4" />Send Money</Link></Button><Button asChild variant="secondary" className="bg-green-500 hover:bg-green-400 text-white"><Link to="/dashboard/transfers?tab=receive"><ArrowDownLeft className="mr-2 h-4 w-4" />Receive</Link></Button></div></CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Card Status</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-4"><div className="flex items-center justify-between"><CreditCard className="h-8 w-8 text-green-600" /><Badge className="bg-green-100 text-green-800">Active</Badge></div><p className="text-2xl font-bold">**** **** **** 4582</p><p className="text-xs text-muted-foreground">Expires 12/28</p></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Recent Transactions</CardTitle><CardDescription>Your account activity</CardDescription></CardHeader>
        <CardContent><div className="space-y-4">
          {txns.length === 0 && !txnsQuery.isLoading && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
          {(txns as OverviewTx[]).map((tx) => (<div key={tx.id} className="flex items-center justify-between border-b py-3 last:border-0 last:pb-0"><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${tx.type==='credit'?'bg-green-100 text-green-600':'bg-gray-100 text-gray-600'}`}>{tx.type==='credit'?<ArrowDownLeft className="h-4 w-4"/>:<ArrowUpRight className="h-4 w-4"/>}</div><div><p className="font-medium">{tx.name}</p><p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/>{tx.date}</p></div></div><div className="text-right"><p className={`font-semibold ${tx.type==='credit'?'text-green-600':''}`}>{tx.type==='credit'?'+':'-'}{fmtMoney(Math.round(tx.amount*100), tx.currency)}</p><Badge variant="outline" className="text-xs mt-1">{tx.status}</Badge></div></div>))}
          {balanceQuery.isLoading && <p>Loading...</p>}
          <Button variant="secondary" className="w-full mt-6"><Eye className="mr-2 h-4 w-4"/>View All Transactions</Button>
        </div></CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Deposits</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{fmtMoney(Math.round(((txnsQuery.data as OverviewTx[] | undefined)?.filter(t=>t.type==='credit').reduce((s,t)=>s+t.amount,0)||0)*100),'EUR')}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{fmtMoney(Math.round(((txnsQuery.data as OverviewTx[] | undefined)?.filter(t=>t.type==='debit').reduce((s,t)=>s+t.amount,0)||0)*100),'EUR')}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{fmtMoney(Math.round(((txnsQuery.data as OverviewTx[] | undefined)?.filter(t=>t.status==='pending').reduce((s,t)=>s+t.amount,0)||0)*100),'EUR')}</div></CardContent></Card>
      </div>
    </div>
  );
}