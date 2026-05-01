import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, DollarSign, Lock, Unlock, CheckCircle2, XCircle, Trash2, Eye, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
  getAllUsers, getAllAccounts, getAllTransactions, getAllKyc, getAllAuditLogs,
  getUserById, updateBalance as localUpdateBalance, addTransaction as localAddTransaction,
  updateKycStatus, addAuditLog as localAddAuditLog, getPrimaryAccount,
  updateTransactionStatus, toggleUserFreeze, deleteUser,
  type MockAccount, type MockTransaction, type MockKyc, type MockAuditLog,
} from '@/lib/mockStore';
import {
  apiGetAllUsers, apiGetAllAccounts, apiGetAllTransactions, apiGetAllKyc, apiGetAuditLogs,
  apiUpdateBalance, apiAddTransaction, apiAddAuditLog, apiToggleFreeze, apiDeleteUser, apiUpdateKyc,
} from '@/lib/backendStore';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  balanceCents: number;
  accounts: Array<{ id: string; name: string; currency: string; balance_cents: number; is_primary: boolean }>;
  frozen: boolean;
  kycStatus: string;
  createdAt: string;
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
    (async () => {
      try {
        // Try Render API first, fall back to localStorage
        let allUsers: any[], allAccounts: any[], allTx: any[], allKyc: any[], allLogs: any[];
        try {
          [allUsers, allAccounts, allTx, allKyc, allLogs] = await Promise.all([
            apiGetAllUsers(), apiGetAllAccounts(), apiGetAllTransactions(), apiGetAllKyc(), apiGetAuditLogs()
          ]);
        } catch {
          allUsers = getAllUsers();
          allAccounts = getAllAccounts();
          allTx = getAllTransactions();
          allKyc = getAllKyc();
          allLogs = getAllAuditLogs();
        }

        const accountsByUser = new Map<string, any[]>();
        allAccounts.forEach((a: any) => {
          const uid = a.user_id || a.userId;
          if (!accountsByUser.has(uid)) accountsByUser.set(uid, []);
          accountsByUser.get(uid)!.push(a);
        });

        const kycByUser = new Map<string, string>();
        allKyc.forEach((k: any) => { kycByUser.set(k.user_id || k.userId, k.status); });

        const mappedUsers: AdminUser[] = allUsers.map((u: any) => {
          const accounts = accountsByUser.get(u.id) || [];
          const primary = accounts.find((a: any) => a.is_primary || a.isPrimary) || accounts[0];
          return {
            id: u.id,
            name: u.full_name || u.fullName || (u.email || 'unknown').split('@')[0] || 'User',
            email: u.email || 'unknown',
            balanceCents: Number(primary?.balance_cents || primary?.balanceCents || 0),
            accounts: accounts.map((a: any) => ({
              id: a.id, name: a.name, currency: a.currency,
              balance_cents: Number(a.balance_cents || a.balanceCents || 0),
              is_primary: a.is_primary ?? a.isPrimary ?? false,
            })),
            frozen: u.frozen ?? false,
            kycStatus: kycByUser.get(u.id) || 'not_started',
            createdAt: u.created_at || u.createdAt || new Date().toISOString(),
          };
        });

        setUsers(mappedUsers);
        setKycRows(allKyc.map((k: any) => ({ ...k, userId: k.user_id || k.userId, documentType: k.document_type || k.documentType, documentCountry: k.document_country || k.documentCountry, submittedAt: k.submitted_at || k.submittedAt })));
        setTransactions(allTx.map((t: any) => ({ ...t, userId: t.user_id || t.userId, accountId: t.account_id || t.accountId, amountCents: Number(t.amount_cents || t.amountCents || 0), counterpartyName: t.counterparty_name, counterpartyIban: t.counterparty_iban, createdAt: t.created_at || t.createdAt })));
        setLogs(allLogs.map((l: any) => ({ ...l, adminEmail: l.admin_email || l.adminEmail, targetEmail: l.target_email || l.targetEmail, createdAt: l.created_at || l.createdAt })));
        setLoading(false);
      } catch (e: any) {
        toast.error('Failed to load data: ' + e.message);
        setLoading(false);
      }
    })();
  };

  useEffect(() => { loadData(); }, []);

  const filteredUsers = useMemo(
    () => users.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // ---- handlers ----
  const handleAddMoney = async () => {
    if (!selectedUserId) return;
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) { toast.error('Enter a valid amount'); return; }
    const targetUser = getUserById(selectedUserId);
    const primary = getPrimaryAccount(selectedUserId);
    const primaryData = await primary;
    const targetData = await targetUser;
    if (!primaryData || !targetData) { toast.error('User or account not found'); return; }

    const centsAmt = Math.round(numAmount * 100);
    let newBalance: number;
    if (adjustMode === 'add_balance') newBalance = primary.balanceCents + centsAmt;
    else if (adjustMode === 'debit_balance') {
      newBalance = primary.balanceCents - centsAmt;
      if (newBalance < 0) { toast.error('Insufficient balance'); return; }
    } else newBalance = centsAmt;

    // Fallback to localStorage mutation
    try { await apiUpdateBalance(primary.id, newBalance); } catch {}
    localUpdateBalance(primary.id, newBalance);
    const direction = adjustMode === 'debit_balance' ? 'debit' : 'credit';
    const effectiveAmount = adjustMode === 'set_balance' ? Math.abs(newBalance - primary.balanceCents) : centsAmt;
    if (effectiveAmount > 0) {
      try { await apiAddTransaction({ userId: selectedUserId, accountId: primary.id, direction, amountCents: effectiveAmount, currency: primary.currency, description: reason || 'Admin balance adjustment', category: 'Admin', status: 'completed' }); } catch {}
      localAddTransaction({
        userId: selectedUserId, accountId: primary.id, direction,
        amountCents: effectiveAmount, currency: primary.currency,
        description: reason || 'Admin balance adjustment', category: 'Admin', status: 'completed',
      } as any);
    }
    try { await apiAddAuditLog({ action: adjustMode, adminEmail: 'admin@agribank.com', targetEmail: targetUser.email, amount: centsAmt, reason }); } catch {}
    localAddAuditLog({ action: adjustMode, adminEmail: 'admin@agribank.com', targetEmail: targetUser.email, amount: centsAmt, reason });
    toast.success('Balance updated');
    setAmount(''); setSelectedUserId(null);
    loadData();
  };

  const handleFreezeToggle = (userId: string) => {
    const user = toggleUserFreeze(userId);
    if (!user) { toast.error('User not found'); return; }
    try { apiToggleFreeze(userId); } catch {}
    localAddAuditLog({ action: user.frozen ? 'freeze_account' : 'unfreeze_account', adminEmail: 'admin@agribank.com', targetEmail: user.email, amount: 0, reason: user.frozen ? 'Account frozen' : 'Account unfrozen' });
    try { apiAddAuditLog({ action: user.frozen ? 'freeze_account' : 'unfreeze_account', adminEmail: 'admin@agribank.com', targetEmail: user.email, amount: 0, reason: user.frozen ? 'Account frozen' : 'Account unfrozen' }); } catch {}
    toast.success(user.frozen ? 'Account frozen' : 'Account unfrozen');
    loadData();
  };

  const handleDeleteUser = (userId: string) => {
    const target = getUserById(userId);
    if (!target) return;
    if (!confirm(`Delete user ${target.email} and all their data? This cannot be undone.`)) return;
    try { apiDeleteUser(userId); } catch {}
    deleteUser(userId);
    localAddAuditLog({ action: 'delete_user', adminEmail: 'admin@agribank.com', targetEmail: target.email, amount: 0, reason: 'Admin deleted user' });
    try { apiAddAuditLog({ action: 'delete_user', adminEmail: 'admin@agribank.com', targetEmail: target.email, amount: 0, reason: 'Admin deleted user' }); } catch {}
    toast.success('User deleted');
    setSelectedUserId(null);
    loadData();
  };

  const handleKycDecision = (kycId: string, userId: string, decision: 'verified' | 'rejected') => {
    try { apiUpdateKyc(kycId, decision); } catch {}
    updateKycStatus(kycId, decision);
    const target = getUserById(userId);
    localAddAuditLog({
      action: decision === 'verified' ? 'approve_kyc' : 'reject_kyc',
      adminEmail: 'admin@agribank.com', targetEmail: target?.email || null,
      amount: 0, reason: decision === 'verified' ? 'KYC approved' : 'KYC rejected',
    });
    try { apiAddAuditLog({ action: decision === 'verified' ? 'approve_kyc' : 'reject_kyc', adminEmail: 'admin@agribank.com', targetEmail: target?.email || null, amount: 0, reason: decision === 'verified' ? 'KYC approved' : 'KYC rejected' }); } catch {}
    toast.success(decision === 'verified' ? 'KYC approved' : 'KYC rejected');
    loadData();
  };

  const handleCreateManualTransaction = async () => {
    if (!selectedUser) { toast.error('Select a user first'); return; }
    const amountNum = Number(txAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) { toast.error('Enter valid amount'); return; }
    const account = selectedUser.accounts.find(a => a.id === txTargetUserId) || selectedUser.accounts[0];
    if (!account) { toast.error('No account found'); return; }

    const centsAmt = Math.round(amountNum * 100);
    try { await apiAddTransaction({ userId: selectedUser.id, accountId: account.id, direction: txDirection, amountCents: centsAmt, currency: account.currency, description: txDescription, category: 'Manual', status: txStatus }); } catch {}
    localAddTransaction({
      userId: selectedUser.id, accountId: account.id, direction: txDirection,
      amountCents: centsAmt, currency: account.currency,
      description: txDescription, category: 'Manual', status: txStatus,
    } as any);
    if (txApplyBalance) {
      const delta = txDirection === 'credit' ? centsAmt : -centsAmt;
      const newBal = account.balance_cents + delta;
      if (newBal < 0) { toast.error('Balance cannot go negative'); return; }
      try { await apiUpdateBalance(account.id, newBal); } catch {}
      localUpdateBalance(account.id, newBal);
    }
    localAddAuditLog({ action: 'create_transaction', adminEmail: 'admin@agribank.com', targetEmail: selectedUser.email, amount: centsAmt, reason: txDescription });
    try { await apiAddAuditLog({ action: 'create_transaction', adminEmail: 'admin@agribank.com', targetEmail: selectedUser.email, amount: centsAmt, reason: txDescription }); } catch {}
    toast.success('Transaction created');
    setTxAmount('');
    loadData();
  };

  const handleUpdateTransactionStatus = (tx: MockTransaction, nextStatus: 'pending' | 'completed' | 'failed') => {
    updateTransactionStatus(tx.id, nextStatus);
    localAddAuditLog({ action: 'update_transaction_status', adminEmail: 'admin@agribank.com', targetEmail: null, amount: 0, reason: `Status → ${nextStatus}` });
    toast.success('Updated');
    loadData();
  };

  // User name lookup helper
  const userNameById = (userId: string) => {
    const u = users.find(x => x.id === userId);
    return u ? u.name : userId.slice(0, 8) + '…';
  };
  const userEmailById = (userId: string) => {
    const u = users.find(x => x.id === userId);
    return u ? u.email : userId.slice(0, 8) + '…';
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
          <p className="text-muted-foreground">User controls, KYC review, and audit-first operations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { localStorage.removeItem('adminAuthenticated'); navigate('/admin-login'); }}>Logout</Button>
        </div>
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

        {/* ---- USERS ---- */}
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>
                  )}
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className={u.frozen ? 'opacity-60' : ''}>
                      <TableCell>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </TableCell>
                      <TableCell className="font-mono">€{(u.balanceCents / 100).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          u.kycStatus === 'verified' ? 'bg-green-100 text-green-700' :
                          u.kycStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                          u.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' : ''
                        }>{u.kycStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.frozen ? <Badge variant="destructive" className="text-xs">Frozen</Badge> : <Badge variant="outline" className="text-xs bg-green-100 text-green-700">Active</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setSelectedUserId(u.id)}><Eye className="h-4 w-4" /></Button>
                          <Button size="sm" variant="secondary" onClick={() => setSelectedUserId(u.id)}><DollarSign className="h-4 w-4" /></Button>
                          <Button size="sm" variant={u.frozen ? 'default' : 'destructive'} onClick={() => handleFreezeToggle(u.id)}>
                            {u.frozen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Balance adjustment */}
              {selectedUserId && (
                <Card className="mt-6 border-dashed border-2 border-amber-500">
                  <CardHeader><CardTitle>Adjust Balance</CardTitle><CardDescription>Server-side logged action</CardDescription></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Button type="button" variant={adjustMode === 'add_balance' ? 'default' : 'outline'} onClick={() => setAdjustMode('add_balance')}>Credit</Button>
                      <Button type="button" variant={adjustMode === 'debit_balance' ? 'default' : 'outline'} onClick={() => setAdjustMode('debit_balance')}>Debit</Button>
                      <Button type="button" variant={adjustMode === 'set_balance' ? 'default' : 'outline'} onClick={() => setAdjustMode('set_balance')}>Set Balance</Button>
                    </div>
                    <Input type="number" placeholder="Amount in EUR" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <div className="flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-700" onClick={handleAddMoney}>Apply</Button>
                      <Button variant="secondary" onClick={() => setSelectedUserId(null)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* User detail card */}
              {selectedUser && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>User Details: {selectedUser.name}</CardTitle>
                    <CardDescription>{selectedUser.email} · Joined {new Date(selectedUser.createdAt).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Email</span><p className="font-medium">{selectedUser.email}</p></div>
                      <div><span className="text-muted-foreground">KYC</span><p><Badge variant="outline">{selectedUser.kycStatus}</Badge></p></div>
                      <div><span className="text-muted-foreground">Status</span><p>{selectedUser.frozen ? <Badge variant="destructive">Frozen</Badge> : <Badge variant="outline" className="bg-green-100 text-green-700">Active</Badge>}</p></div>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground pt-2 border-t">Accounts</p>
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

        {/* ---- TRANSACTIONS ---- */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Manual Transaction Entry</CardTitle><CardDescription>Select a user on User Management tab first.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {!selectedUser ? (
                <p className="text-sm text-muted-foreground">No user selected.</p>
              ) : (
                <>
                  <Label>Target account</Label>
                  <select className="w-full border rounded-md h-10 px-3 bg-background" value={txTargetUserId || selectedUser.accounts[0]?.id || ''} onChange={(e) => setTxTargetUserId(e.target.value)}>
                    {selectedUser.accounts.map((a) => (<option key={a.id} value={a.id}>{a.name} · {a.currency}</option>))}
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
                    Apply to balance
                  </label>
                  <Button onClick={handleCreateManualTransaction}>Create transaction</Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions.</TableCell></TableRow>}
                  {transactions.slice(0, 40).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs"><p className="font-medium">{userNameById(tx.userId)}</p><p className="text-muted-foreground">{userEmailById(tx.userId)}</p></TableCell>
                      <TableCell className="text-sm">{tx.description}</TableCell>
                      <TableCell className="text-sm">{tx.direction === 'credit' ? '+' : '-'}{tx.currency} {(tx.amountCents / 100).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{tx.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => handleUpdateTransactionStatus(tx, 'pending')}>P</Button>
                        <Button size="sm" variant="outline" onClick={() => handleUpdateTransactionStatus(tx, 'completed')}>C</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleUpdateTransactionStatus(tx, 'failed')}>F</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- KYC ---- */}
        <TabsContent value="kyc" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>KYC Queue</CardTitle><CardDescription>Approve or reject pending verifications.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Document</TableHead><TableHead>Address</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {kycRows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No KYC submissions.</TableCell></TableRow>}
                  {kycRows.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{userNameById(k.userId)}</p>
                        <p className="text-xs text-muted-foreground">{userEmailById(k.userId)}</p>
                      </TableCell>
                      <TableCell className="text-xs">{k.documentType || '-'} · {k.documentCountry || '-'}</TableCell>
                      <TableCell className="text-xs">{k.city || '-'}, {k.country || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{k.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => handleKycDecision(k.id, k.userId, 'verified')}><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleKycDecision(k.id, k.userId, 'rejected')}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- LOGS ---- */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Admin Audit Logs</CardTitle><CardDescription>All admin actions are traceable.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Amount</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                <TableBody>
                  {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No audit logs.</TableCell></TableRow>}
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{l.adminEmail}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{l.action}</Badge></TableCell>
                      <TableCell className="text-xs">{l.targetEmail || '-'}</TableCell>
                      <TableCell className="text-xs">{l.amount ? '€' + (l.amount / 100).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-xs">{l.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- NOTES ---- */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Security Notes</CardTitle><CardDescription>Running in offline mock mode — no Supabase connection.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• localStorage mock store (key: agribank_mock_db).</p>
              <p>• All users created via /auth are visible here.</p>
              <p>• Freeze, delete, KYC decisions are all logged.</p>
              <p>• Do not use hardcoded admin credentials in production.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}