import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, DollarSign, Lock, Unlock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
  getAllUsers, getAllAccounts, getAllTransactions, getAllKyc, getAllAuditLogs,
  getUserById, updateBalance, addTransaction, updateKycStatus, addAuditLog, getPrimaryAccount,
  updateTransactionStatus,
  type MockAccount, type MockTransaction, type MockKyc, type MockAuditLog,
} from '@/lib/mockStore';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  balanceCents: number;
  accounts: Array<{ id: string; name: string; currency: string; balance_cents: number; is_primary: boolean }>;
  frozen: boolean;
  kycStatus: string;
};

export default function Admin() {
  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = localStorage.getItem('adminAuthenticated');
    if (!isAdmin) navigate('/admin-login');
  }, [navigate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [kycRows, setKycRows] = useState<MockKyc[]>([]);
  const [transactions, setTransactions] = useState<MockTransaction[]>([]);
  const [logs, setLogs] = useState<MockAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [adjustMode, setAdjustMode] = useState<'add_balance' | 'debit_balance' | 'set_balance'>('add_balance');
  const [reason, setReason] = useState('Manual admin adjustment');

  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('Manual transaction entry');
  const [txDirection, setTxDirection] = useState<'credit' | 'debit'>('credit');
  const [txStatus, setTxStatus] = useState<'pending' | 'completed' | 'failed'>('completed');
  const [txApplyBalance, setTxApplyBalance] = useState(true);
  const [txTargetUserId, setTxTargetUserId] = useState<string>('');

  const loadData = () => {
    setLoading(true);
    // Small delay to simulate loading
    setTimeout(() => {
      const allUsers = getAllUsers();
      const allAccounts = getAllAccounts();
      const allTx = getAllTransactions();
      const allKyc = getAllKyc();
      const allLogs = getAllAuditLogs();

      const accountsByUser = new Map<string, MockAccount[]>();
      allAccounts.forEach(a => {
        if (!accountsByUser.has(a.userId)) accountsByUser.set(a.userId, []);
        accountsByUser.get(a.userId)!.push(a);
      });

      const mappedUsers: AdminUser[] = allUsers.map(u => {
        const accounts = accountsByUser.get(u.id) || [];
        const primary = accounts.find(a => a.isPrimary) || accounts[0];
        return {
          id: u.id,
          name: u.fullName || u.email?.split('@')[0] || 'User',
          email: u.email || 'unknown',
          balanceCents: primary?.balanceCents || 0,
          accounts: accounts.map(a => ({
            id: a.id,
            name: a.name,
            currency: a.currency,
            balance_cents: a.balanceCents,
            is_primary: a.isPrimary,
          })),
          frozen: false,
          kycStatus: 'not_started',
        };
      });

      setUsers(mappedUsers);
      setKycRows(allKyc);
      setTransactions(allTx);
      setLogs(allLogs);
      setLoading(false);
    }, 200);
  };

  useEffect(() => { loadData(); }, []);

  const filteredUsers = useMemo(
    () => users.filter(
      u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.email.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [users, searchQuery]
  );

  const selectedUser = users.find(u => u.id === selectedUserId) || null;

  const summary = useMemo(() => {
    const totalUsers = users.length;
    const totalBalance = users.reduce((sum, u) => sum + u.balanceCents, 0);
    const pendingKyc = kycRows.filter(k => k.status === 'pending').length;
    const totalTx = transactions.length;
    return { totalUsers, totalBalance, pendingKyc, totalTx };
  }, [users, transactions, kycRows]);

  const handleAddMoney = async (userId: string) => {
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    const targetUser = getUserById(userId);
    const primary = getPrimaryAccount(userId);
    if (!primary || !targetUser) {
      toast.error('User or account not found');
      return;
    }

    const centsAmt = Math.round(numAmount * 100);
    let newBalance: number;

    if (adjustMode === 'add_balance') {
      newBalance = primary.balanceCents + centsAmt;
    } else if (adjustMode === 'debit_balance') {
      newBalance = primary.balanceCents - centsAmt;
      if (newBalance < 0) {
        toast.error('Insufficient balance for debit');
        return;
      }
    } else {
      newBalance = centsAmt;
    }

    updateBalance(primary.id, newBalance);

    // Record transaction
    const direction = adjustMode === 'debit_balance' ? 'debit' : 'credit';
    const effectiveAmount = adjustMode === 'set_balance' ? Math.abs(newBalance - primary.balanceCents) : centsAmt;
    addTransaction({
      userId,
      accountId: primary.id,
      direction,
      amountCents: effectiveAmount,
      currency: primary.currency,
      description: reason || 'Admin balance adjustment',
      category: 'Admin',
      status: 'completed',
    });

    addAuditLog({
      action: adjustMode,
      adminEmail: 'admin@agribank.com',
      targetEmail: targetUser.email,
      amount: centsAmt,
      reason,
    });

    toast.success('Balance updated');
    setAmount('');
    setSelectedUserId(null);
    loadData();
  };

  const handleKycDecision = (kycId: string, userId: string, decision: 'verified' | 'rejected') => {
    updateKycStatus(kycId, decision);
    const target = getUserById(userId);
    addAuditLog({
      action: decision === 'verified' ? 'approve_kyc' : 'reject_kyc',
      adminEmail: 'admin@agribank.com',
      targetEmail: target?.email || null,
      amount: 0,
      reason: decision === 'verified' ? 'KYC approved' : 'KYC rejected',
    });
    toast.success(decision === 'verified' ? 'KYC approved' : 'KYC rejected');
    loadData();
  };

  const handleCreateManualTransaction = async () => {
    if (!selectedUser) {
      toast.error('Select a user first');
      return;
    }
    const amountNum = Number(txAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('Enter valid transaction amount');
      return;
    }
    const account = selectedUser.accounts.find(a => a.id === txTargetUserId) || selectedUser.accounts[0];
    if (!account) {
      toast.error('No account found for selected user');
      return;
    }

    const centsAmt = Math.round(amountNum * 100);
    addTransaction({
      userId: selectedUser.id,
      accountId: account.id,
      direction: txDirection,
      amountCents: centsAmt,
      currency: account.currency,
      description: txDescription,
      category: 'Manual',
      status: txStatus,
    });

    if (txApplyBalance) {
      const delta = txDirection === 'credit' ? centsAmt : -centsAmt;
      const newBal = account.balance_cents + delta;
      if (newBal < 0) {
        toast.error('Balance cannot go negative');
        return;
      }
      updateBalance(account.id, newBal);
    }

    addAuditLog({
      action: 'create_transaction',
      adminEmail: 'admin@agribank.com',
      targetEmail: selectedUser.email,
      amount: centsAmt,
      reason: txDescription,
    });

    toast.success('Manual transaction created');
    setTxAmount('');
    loadData();
  };

  const handleUpdateTransactionStatus = (tx: MockTransaction, nextStatus: 'pending' | 'completed' | 'failed') => {
    updateTransactionStatus(tx.id, nextStatus);
    addAuditLog({
      action: 'update_transaction_status',
      adminEmail: 'admin@agribank.com',
      targetEmail: null,
      amount: 0,
      reason: `Admin changed status to ${nextStatus}`,
    });
    toast.success('Transaction status updated');
    loadData();
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
          <p className="text-muted-foreground">User controls, KYC review, and audit-first operations.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            localStorage.removeItem('adminAuthenticated');
            navigate('/admin-login');
          }}
        >
          Logout
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Users</p><p className="text-2xl font-semibold">{summary.totalUsers}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Balance</p><p className="text-2xl font-semibold">€{(summary.totalBalance / 100).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Pending KYC</p><p className="text-2xl font-semibold">{summary.pendingKyc}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Transactions</p><p className="text-2xl font-semibold">{summary.totalTx}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="users" className="mt-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="kyc">KYC Review</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="notes">Security Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Offline mock store — data shared via localStorage.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center mb-4">
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-md" />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No users found. Create accounts via the Auth page (/auth) to see them here.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </TableCell>
                      <TableCell className="font-mono">€{(u.balanceCents / 100).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.kycStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant={u.frozen ? 'default' : 'destructive'} onClick={() => toast.info('Freeze feature ready for Supabase integration')}>
                            {u.frozen ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                            {u.frozen ? 'Unfreeze' : 'Freeze'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setSelectedUserId(u.id)}>
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedUserId && (
                <Card className="mt-6 border-dashed border-2 border-amber-500">
                  <CardHeader>
                    <CardTitle>Adjust Balance</CardTitle>
                    <CardDescription>Server-side logged action (mock)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Button type="button" variant={adjustMode === 'add_balance' ? 'default' : 'outline'} onClick={() => setAdjustMode('add_balance')}>Credit</Button>
                      <Button type="button" variant={adjustMode === 'debit_balance' ? 'default' : 'outline'} onClick={() => setAdjustMode('debit_balance')}>Debit</Button>
                      <Button type="button" variant={adjustMode === 'set_balance' ? 'default' : 'outline'} onClick={() => setAdjustMode('set_balance')}>Set Balance</Button>
                    </div>
                    <Input type="number" placeholder="Amount in EUR" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <div className="flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleAddMoney(selectedUserId)}>Apply</Button>
                      <Button variant="secondary" onClick={() => setSelectedUserId(null)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedUser && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>User Accounts</CardTitle>
                    <CardDescription>{selectedUser.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedUser.accounts.map((a) => (
                      <div key={a.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                        <span>{a.name} {a.is_primary ? '(Primary)' : ''}</span>
                        <span>{a.currency} {(a.balance_cents / 100).toLocaleString()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {loading && <p className="text-sm text-muted-foreground mt-4">Loading users...</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Transaction Entry</CardTitle>
              <CardDescription>Select a user on User Management tab first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedUser ? (
                <p className="text-sm text-muted-foreground">No user selected.</p>
              ) : (
                <>
                  <Label>Target account</Label>
                  <select
                    className="w-full border rounded-md h-10 px-3 bg-background"
                    value={txTargetUserId || selectedUser.accounts[0]?.id || ''}
                    onChange={(e) => setTxTargetUserId(e.target.value)}
                  >
                    {selectedUser.accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>
                    ))}
                  </select>
                  <div className="grid sm:grid-cols-4 gap-2">
                    <Button type="button" variant={txDirection === 'credit' ? 'default' : 'outline'} onClick={() => setTxDirection('credit')}>Credit</Button>
                    <Button type="button" variant={txDirection === 'debit' ? 'default' : 'outline'} onClick={() => setTxDirection('debit')}>Debit</Button>
                    <Button type="button" variant={txStatus === 'completed' ? 'default' : 'outline'} onClick={() => setTxStatus('completed')}>Completed</Button>
                    <Button type="button" variant={txStatus === 'pending' ? 'default' : 'outline'} onClick={() => setTxStatus('pending')}>Pending</Button>
                  </div>
                  <Input placeholder="Amount" type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
                  <Input placeholder="Description" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} />
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={txApplyBalance} onChange={(e) => setTxApplyBalance(e.target.checked)} />
                    Apply transaction to actual account balance
                  </label>
                  <Button onClick={handleCreateManualTransaction}>Create transaction history</Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions yet.</TableCell>
                    </TableRow>
                  )}
                  {transactions.slice(0, 30).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.userId.slice(0, 8)}…</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>{tx.direction === 'credit' ? '+' : '-'} {tx.currency} {(tx.amountCents / 100).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{tx.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleUpdateTransactionStatus(tx, 'pending')}>Pending</Button>
                        <Button size="sm" variant="outline" onClick={() => handleUpdateTransactionStatus(tx, 'completed')}>Complete</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleUpdateTransactionStatus(tx, 'failed')}>Fail</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>KYC Queue</CardTitle>
              <CardDescription>Pending applications should be approved/rejected by admin only.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kycRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No KYC submissions yet.</TableCell>
                    </TableRow>
                  )}
                  {kycRows.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-mono text-xs">{k.userId.slice(0, 8)}…</TableCell>
                      <TableCell>{k.documentType || '-'} · {k.documentCountry || '-'}</TableCell>
                      <TableCell>{k.city || '-'}, {k.country || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{k.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => handleKycDecision(k.id, k.userId, 'verified')}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleKycDecision(k.id, k.userId, 'rejected')}>
                            <XCircle className="h-4 w-4 mr-1" />Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Audit Logs</CardTitle>
              <CardDescription>Everything admin does should be traceable.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No audit logs yet.</TableCell>
                    </TableRow>
                  )}
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{new Date(l.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{l.adminEmail}</TableCell>
                      <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                      <TableCell>{l.targetEmail || '-'}</TableCell>
                      <TableCell>{l.amount ? (l.amount / 100).toLocaleString() : '-'}</TableCell>
                      <TableCell>{l.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Notes</CardTitle>
              <CardDescription>Running in offline mock mode — no Supabase connection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Currently using localStorage mock store (key: agribank_mock_db).</p>
              <p>• All users created via /auth are visible here.</p>
              <p>• Do not keep hardcoded admin credentials in production.</p>
              <p>• All freeze/balance/KYC decisions are logged in audit logs.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}