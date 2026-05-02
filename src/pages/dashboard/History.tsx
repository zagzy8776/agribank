import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, ArrowUpRight, ArrowDownLeft, Copy, Download } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { getUserTransactions } from '@/lib/db';
import { useState } from 'react';

import type { Transaction as DbTransaction } from '@/lib/db';

type Transaction = DbTransaction;


const History = () => {
  const { user } = useAuth();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const txnsQuery = useQuery({
    queryKey: ['history', user?.userId],
    queryFn: async () => {
      if (!user?.userId) return [];
      const txs = await getUserTransactions(user.userId);
      return txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
  });

  const transactions = txnsQuery.data || [];

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  const openReceipt = (tx: Transaction) => setSelectedTx(tx);

  const copyReceipt = async (text: string) => {
    await navigator.clipboard.writeText(text);
    // Use toast if available, or alert
    alert('Receipt details copied!');
  };

  const receiptText = (tx: Transaction) => {
    const amount = fmtMoney(tx.amount_cents, tx.currency);
    const dir = tx.direction === 'credit' ? 'Received' : 'Sent';
    return `${dir} ${amount}\nDescription: ${tx.description}\nDate: ${formatDate(tx.created_at)}\nStatus: ${tx.status}${tx.counterparty_name ? `\nTo/From: ${tx.counterparty_name}` : ''}${tx.network ? `\nNetwork: ${tx.network}` : ''}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transaction History</h2>
        <p className="text-muted-foreground">View all your transfers and account activity.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Full list of transactions with receipt details.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDate(tx.created_at)}</TableCell>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell>
                      <span className={tx.direction === 'credit' ? 'text-green-600' : 'text-red-600'}>
                        {tx.direction === 'credit' ? '+' : '-'}{fmtMoney(tx.amount_cents, tx.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openReceipt(tx)}>
                        View Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Receipt</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between"><span>Direction</span><span>{selectedTx.direction === 'credit' ? 'Received' : 'Sent'}</span></div>
              <div className="flex justify-between"><span>Description</span><span>{selectedTx.description}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>Amount</span><span>{fmtMoney(selectedTx.amount_cents, selectedTx.currency)}</span></div>
              <div className="flex justify-between"><span>Date</span><span>{formatDate(selectedTx.created_at)}</span></div>
              <div className="flex justify-between"><span>Status</span><span>{selectedTx.status}</span></div>
              {selectedTx.counterparty_name && <div className="flex justify-between"><span>Counterparty</span><span>{selectedTx.counterparty_name}</span></div>}
              {selectedTx.network && <div className="flex justify-between"><span>Network</span><span>{selectedTx.network}</span></div>}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => copyReceipt(receiptText(selectedTx))}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default History;
