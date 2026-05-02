import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, DollarSign, Lock, Unlock, CheckCircle2, XCircle, Trash2, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
  getAllUsers, getAllAccounts, getAllTransactions, getAllKyc, getAllAuditLogs,
  getUserById, updateBalance, addTransaction, updateKycStatus, addAuditLog,
  toggleUserFreeze, deleteUser, type User, type Account, type Transaction, type Kyc, type AuditLog,
} from '@/lib/db';

type AdminUser = {
  id: string; name: string; email: string; balanceCents: number;
  accounts: Array<{ id: string; name: string; currency: string; balance_cents: number; is_primary: boolean }>;
  frozen: boolean; kycStatus: string; createdAt: string;
};

export default function Admin() {
  const navigate = useNavigate();
  useEffect(() => { if (!localStorage.getItem('adminAuthenticated')) navigate('/admin-login'); }, [navigate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [kycRows, setKycRows] = useState<Kyc[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [adjustMode, setAdjustMode] = useState<'add_balance' | 'debit_balance' | 'set_balance'>('add_balance');
  const [reason, setReason] = useState('Manual admin adjustment');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('Manual transaction');
  const [txDir, setTxDir] = useState<'credit'|'debit'>('credit');
  const [txStatus, setTxStatus] = useState<'pending'|'completed'|'failed'>('completed');
  const [txApplyBal, setTxApplyBal] = useState(true);
  const [txAcctId, setTxAcctId] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([getAllUsers(), getAllAccounts(), getAllTransactions(), getAllKyc(), getAllAuditLogs()])
      .then(([allUsers, allAccts, allTx, allKyc, allLogs]) => {
        const acctMap = new Map<string, Account[]>();
        allAccts.forEach(a => { if (!acctMap.has(a.user_id)) acctMap.set(a.user_id, []); acctMap.get(a.user_id)!.push(a); });
        const kycMap = new Map<string, string>();
        allKyc.forEach(k => { kycMap.set(k.user_id, k.status); });
        setUsers(allUsers.map(u => {
          const accts = acctMap.get(u.id) || [];
          const primary = accts.find(a => a.is_primary) || accts[0];
          return { id: u.id, name: u.full_name || (u.email||'').split('@')[0]||'User', email: u.email, balanceCents: Number(primary?.balance_cents || 0), accounts: accts.map(a => ({ id: a.id, name: a.name, currency: a.currency, balance_cents: Number(a.balance_cents), is_primary: a.is_primary })), frozen: u.frozen, kycStatus: kycMap.get(u.id)||'not_started', createdAt: u.created_at };
        }));
        setKycRows(allKyc); setTransactions(allTx); setLogs(allLogs); setLoading(false);
      }).catch(e => { toast.error('Failed to load: ' + e.message); setLoading(false); });
  };
  useEffect(() => { loadData(); }, []);

  const filteredUsers = useMemo(() => users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())), [users, searchQuery]);
  const selectedUser = users.find(u => u.id === selectedUserId) || null;
  const summary = useMemo(() => ({ totalUsers: users.length, totalBalance: users.reduce((s,u)=>s+u.balanceCents,0), pendingKyc: kycRows.filter(k=>k.status==='pending').length, totalTx: transactions.length }), [users, transactions, kycRows]);
  const userNameById = (uid: string) => { const u = users.find(x=>x.id===uid); return u ? u.name : uid.slice(0,8)+'…'; };
  const userEmailById = (uid: string) => { const u = users.find(x=>x.id===uid); return u ? u.email : ''; };

  const handleAddMoney = () => {
    if (!selectedUserId || !selectedUser) return;
    const num = Number(amount); if (!Number.isFinite(num)||num<=0) { toast.error('Enter valid amount'); return; }
    const acct = selectedUser.accounts.find(a=>a.is_primary)||selectedUser.accounts[0];
    if (!acct) { toast.error('No account'); return; }
    const cents = Math.round(num*100); let nb: number;
    if (adjustMode==='add_balance') nb = acct.balance_cents + cents;
    else if (adjustMode==='debit_balance') { nb = acct.balance_cents - cents; if (nb<0) { toast.error('Insufficient'); return; } }
    else nb = cents;
    updateBalance(acct.id, nb).then(() => {
      addTransaction({ user_id: selectedUserId, account_id: acct.id, direction: adjustMode==='debit_balance'?'debit':'credit', amount_cents: cents, currency: acct.currency, description: reason, category:'Admin', status:'completed' });
      addAuditLog({ action: adjustMode, admin_email:'admin@agribank.com', target_email: selectedUser.email, amount: cents, reason });
      toast.success('Balance updated'); setAmount(''); setSelectedUserId(null); loadData();
    }).catch(e => toast.error(e.message));
  };

  const handleFreezeToggle = (userId: string) => {
    toggleUserFreeze(userId).then(user => {
      addAuditLog({ action: user?.frozen?'freeze_account':'unfreeze_account', admin_email:'admin@agribank.com', target_email: user?.email||'', amount:0, reason:'' });
      toast.success(user?.frozen?'Frozen':'Unfrozen'); loadData();
    }).catch(e => toast.error(e.message));
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find(u=>u.id===userId); if (!target) return;
    if (!confirm(`Delete ${target.email}?`)) return;
    deleteUser(userId).then(() => { addAuditLog({ action:'delete_user', admin_email:'admin@agribank.com', target_email:target.email, amount:0, reason:'' }); toast.success('Deleted'); setSelectedUserId(null); loadData(); }).catch(e => toast.error(e.message));
  };

  const handleKycDecision = (kycId: string, userId: string, decision: 'verified'|'rejected') => {
    updateKycStatus(kycId, decision).then(() => {
      const target = users.find(u=>u.id===userId);
      addAuditLog({ action: decision==='verified'?'approve_kyc':'reject_kyc', admin_email:'admin@agribank.com', target_email:target?.email||'', amount:0, reason:'' });
      toast.success(decision==='verified'?'KYC approved':'KYC rejected'); loadData();
    }).catch(e => toast.error(e.message));
  };

  const handleCreateTx = () => {
    if (!selectedUser) { toast.error('Select a user'); return; }
    const num = Number(txAmount); if (!Number.isFinite(num)||num<=0) { toast.error('Enter valid amount'); return; }
    const acct = selectedUser.accounts.find(a=>a.id===txAcctId)||selectedUser.accounts[0];
    if (!acct) { toast.error('No account'); return; }
    const cents = Math.round(num*100);
    addTransaction({ user_id:selectedUser.id, account_id:acct.id, direction:txDir, amount_cents:cents, currency:acct.currency, description:txDesc, category:'Manual', status:txStatus }).then(() => {
      if (txApplyBal) updateBalance(acct.id, acct.balance_cents + (txDir==='credit'?cents:-cents));
      addAuditLog({ action:'create_transaction', admin_email:'admin@agribank.com', target_email:selectedUser.email, amount:cents, reason:txDesc });
      toast.success('Tx created'); setTxAmount(''); loadData();
    }).catch(e => toast.error(e.message));
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-7xl">
      <div className="flex justify-between items-center"><div><h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2><p className="text-muted-foreground">Render PostgreSQL — all users visible globally.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={loadData} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading?'animate-spin':''}`}/>Refresh</Button><Button variant="secondary" size="sm" onClick={()=>{localStorage.removeItem('adminAuthenticated');navigate('/admin-login');}}>Logout</Button></div></div>
      <div className="mt-6 grid gap-4 md:grid-cols-4"><Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Users</p><p className="text-2xl font-semibold">{summary.totalUsers}</p></CardContent></Card><Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Balance</p><p className="text-2xl font-semibold">€{(summary.totalBalance/100).toLocaleString()}</p></CardContent></Card><Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Pending KYC</p><p className="text-2xl font-semibold">{summary.pendingKyc}</p></CardContent></Card><Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Transactions</p><p className="text-2xl font-semibold">{summary.totalTx}</p></CardContent></Card></div>
      <Tabs defaultValue="users" className="mt-6"><TabsList className="grid w-full grid-cols-5"><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="transactions">Transactions</TabsTrigger><TabsTrigger value="kyc">KYC</TabsTrigger><TabsTrigger value="logs">Audit Logs</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>

        <TabsContent value="users" className="space-y-4 mt-4"><Card><CardHeader><CardTitle>All Users ({filteredUsers.length})</CardTitle><CardDescription>Connected to Render PostgreSQL.</CardDescription></CardHeader><CardContent><div className="flex items-center mb-4"><Search className="mr-2 h-4 w-4"/><Input placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="max-w-md"/></div>
          <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Balance</TableHead><TableHead>KYC</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filteredUsers.length===0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{loading?'Loading from database...':'No users in database. Create accounts via /auth first.'}</TableCell></TableRow>}{filteredUsers.map(u=>(<TableRow key={u.id} className={u.frozen?'opacity-60':''}><TableCell><p className="font-medium">{u.name}</p><p className="text-sm text-muted-foreground">{u.email}</p></TableCell><TableCell className="font-mono">€{(u.balanceCents/100).toLocaleString()}</TableCell><TableCell><Badge variant="outline" className={u.kycStatus==='verified'?'bg-green-100 text-green-700':u.kycStatus==='pending'?'bg-amber-100':''}>{u.kycStatus}</Badge></TableCell><TableCell>{u.frozen?<Badge variant="destructive">Frozen</Badge>:<Badge variant="outline" className="bg-green-100 text-green-700">Active</Badge>}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={()=>setSelectedUserId(u.id)}><Eye className="h-4 w-4"/></Button><Button size="sm" variant="secondary" onClick={()=>setSelectedUserId(u.id)}><DollarSign className="h-4 w-4"/></Button><Button size="sm" variant={u.frozen?'default':'destructive'} onClick={()=>handleFreezeToggle(u.id)}>{u.frozen?<Unlock className="h-4 w-4"/>:<Lock className="h-4 w-4"/>}</Button><Button size="sm" variant="ghost" onClick={()=>handleDeleteUser(u.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div></TableCell></TableRow>))}</TableBody></Table>
          {selectedUserId && <Card className="mt-6 border-dashed border-2 border-amber-500"><CardHeader><CardTitle>Adjust Balance</CardTitle><CardDescription>Writes to Render PostgreSQL.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="grid sm:grid-cols-3 gap-2"><Button variant={adjustMode==='add_balance'?'default':'outline'} onClick={()=>setAdjustMode('add_balance')}>Credit</Button><Button variant={adjustMode==='debit_balance'?'default':'outline'} onClick={()=>setAdjustMode('debit_balance')}>Debit</Button><Button variant={adjustMode==='set_balance'?'default':'outline'} onClick={()=>setAdjustMode('set_balance')}>Set</Button></div><Input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)}/><Input placeholder="Reason" value={reason} onChange={e=>setReason(e.target.value)}/><div className="flex gap-2"><Button className="bg-green-600" onClick={handleAddMoney}>Apply</Button><Button variant="secondary" onClick={()=>setSelectedUserId(null)}>Cancel</Button></div></CardContent></Card>}
          {selectedUser && <Card className="mt-4"><CardHeader><CardTitle>User: {selectedUser.name}</CardTitle><CardDescription>{selectedUser.email} · Joined {selectedUser.createdAt?new Date(selectedUser.createdAt).toLocaleDateString():'N/A'}</CardDescription></CardHeader><CardContent><div className="grid grid-cols-3 gap-4 text-sm"><div><span className="text-muted-foreground">Email</span><p className="font-medium">{selectedUser.email}</p></div><div><span className="text-muted-foreground">KYC</span><p><Badge variant="outline">{selectedUser.kycStatus}</Badge></p></div><div><span className="text-muted-foreground">Status</span><p>{selectedUser.frozen?<Badge variant="destructive">Frozen</Badge>:<Badge variant="outline" className="bg-green-100 text-green-700">Active</Badge>}</p></div></div><p className="text-xs font-medium mt-3 pt-2 border-t">Accounts</p>{selectedUser.accounts.map(a=>(<div key={a.id} className="flex justify-between text-sm border-b pb-2 last:border-0"><span>{a.name} {a.is_primary?'(Primary)':''}</span><span>{a.currency} {(a.balance_cents/100).toLocaleString()}</span></div>))}</CardContent></Card>}
        </CardContent></Card></TabsContent>

        <TabsContent value="transactions" className="space-y-4 mt-4"><Card><CardHeader><CardTitle>Manual Transaction Entry</CardTitle><CardDescription>Select a user first.</CardDescription></CardHeader><CardContent>{!selectedUser?<p className="text-sm text-muted-foreground">No user selected.</p>:<><Label>Target account</Label><select className="w-full border rounded-md h-10 px-3 bg-background" value={txAcctId||selectedUser.accounts[0]?.id||''} onChange={e=>setTxAcctId(e.target.value)}>{selectedUser.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><div className="grid sm:grid-cols-4 gap-2"><Button variant={txDir==='credit'?'default':'outline'} onClick={()=>setTxDir('credit')}>Credit</Button><Button variant={txDir==='debit'?'default':'outline'} onClick={()=>setTxDir('debit')}>Debit</Button></div><Input placeholder="Amount" type="number" value={txAmount} onChange={e=>setTxAmount(e.target.value)}/><Input placeholder="Description" value={txDesc} onChange={e=>setTxDesc(e.target.value)}/><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={txApplyBal} onChange={e=>setTxApplyBal(e.target.checked)}/>Apply to balance</label><Button onClick={handleCreateTx}>Create</Button></>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Desc</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{transactions.slice(0,40).map(tx=>(<TableRow key={tx.id}><TableCell className="text-xs"><p className="font-medium">{userNameById(tx.user_id)}</p></TableCell><TableCell className="text-sm">{tx.description}</TableCell><TableCell className="text-sm">{tx.direction==='credit'?'+':'-'}{tx.currency} {(tx.amount_cents/100).toLocaleString()}</TableCell><TableCell><Badge variant="outline">{tx.status}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent></Card></TabsContent>

        <TabsContent value="kyc" className="space-y-4 mt-4"><Card><CardHeader><CardTitle>KYC Queue</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Document</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{kycRows.map(k=>(<TableRow key={k.id}><TableCell><p className="text-sm font-medium">{userNameById(k.user_id)}</p></TableCell><TableCell className="text-xs">{k.document_type||'-'} · {k.document_country||'-'}</TableCell><TableCell><Badge variant="outline">{k.status}</Badge></TableCell><TableCell className="text-right"><div className="flex gap-2"><Button size="sm" onClick={()=>handleKycDecision(k.id,k.user_id,'verified')}><CheckCircle2 className="h-4 w-4 mr-1"/>Approve</Button><Button size="sm" variant="destructive" onClick={()=>handleKycDecision(k.id,k.user_id,'rejected')}><XCircle className="h-4 w-4 mr-1"/>Reject</Button></div></TableCell></TableRow>))}</TableBody></Table></CardContent></Card></TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-4"><Card><CardHeader><CardTitle>Audit Logs</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead></TableRow></TableHeader><TableBody>{logs.map(l=>(<TableRow key={l.id}><TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell><TableCell className="text-xs">{l.admin_email}</TableCell><TableCell><Badge variant="outline">{l.action}</Badge></TableCell><TableCell className="text-xs">{l.target_email||'-'}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card></TabsContent>

        <TabsContent value="notes" className="mt-4"><Card><CardHeader><CardTitle>Security Notes</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground"><p>• All data stored in Render PostgreSQL.</p><p>• Admin sees all users globally — any device, any browser.</p><p>• Click Refresh to reload data from database.</p></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}