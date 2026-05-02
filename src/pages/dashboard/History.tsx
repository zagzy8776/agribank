import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, ArrowUpRight, ArrowDownLeft, Copy, Download, Banknote, Users, Globe } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { getUserTransactions } from '@/lib/db';
import { useState, useRef } from 'react';

import type { Transaction as DbTransaction } from '@/lib/db';

type Transaction = DbTransaction;



const History = () => {
  const { user } = useAuth();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

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
    toast.success('Receipt details copied!'); // Assuming toast is imported; add if needed
  };

  const downloadReceipt = async (tx: Transaction) => {
    if (!receiptRef.current || !user) return;
    const canvas = await html2canvas(receiptRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`agribank-receipt-${tx.id}.pdf`);
    toast.success('Receipt downloaded! Open in your phone\'s PDF viewer.');
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
        <p className="text-muted-foreground">View all your transfers and account activity. Download branded receipts as PDF.</p>
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

      {/* Receipt Dialog with Branded PDF Download */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>AgriBank Transfer Receipt</DialogTitle>
          </DialogHeader>
          {selectedTx && user && (
            <div ref={receiptRef} className="space-y-4 text-sm p-4 border rounded-lg bg-white print:p-0 print:border-none">
              {/* Branded Header */}
              <div className="text-center border-b pb-2">
                <Banknote className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-bold text-lg">AgriBank SE</h3>
                <p className="text-xs text-muted-foreground">Frankfurt am Main | BIC: AGRBDEFF</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between"><span>Account Holder</span><span>{user.name || user.email}</span></div>
                <div className="flex justify-between"><span>Transaction ID</span><span>{selectedTx.id}</span></div>
                <div className="flex justify-between"><span>Type</span><span>{selectedTx.direction === 'credit' ? 'Received' : 'Sent'}</span></div>
                <div className="flex justify-between"><span>Description</span><span>{selectedTx.description}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Amount</span><span>{fmtMoney(selectedTx.amount_cents, selectedTx.currency)}</span></div>
                <div className="flex justify-between"><span>Date & Time</span><span>{new Date(selectedTx.created_at).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Status</span><span className={selectedTx.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}>{selectedTx.status.toUpperCase()}</span></div>
                {selectedTx.counterparty_name && <div className="flex justify-between"><span>Counterparty</span><span>{selectedTx.counterparty_name}</span></div>}
                {selectedTx.counterparty_iban && <div className="flex justify-between"><span>IBAN</span><span>{selectedTx.counterparty_iban}</span></div>}
                {selectedTx.network && <div className="flex justify-between"><span>Network</span><span>{selectedTx.network.toUpperCase()}</span></div>}
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground mt-4 pt-2 border-t">
                <p>Thank you for banking with AgriBank.</p>
                <p>Support: support@agribank.com | +49 69 123456</p>
              </div>

              <div className="flex gap-2 pt-4 border-t print:hidden">
                <Button variant="outline" size="sm" onClick={() => copyReceipt(receiptText(selectedTx))}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Details
                </Button>
                <Button variant="secondary" size="sm" onClick={() => downloadReceipt(selectedTx)}>
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

