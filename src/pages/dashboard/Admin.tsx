import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, DollarSign, Lock, Unlock, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';


export default function Admin() {
  const navigate = useNavigate();
  
  // Check admin authentication
  useEffect(() => {
    const isAdmin = localStorage.getItem('adminAuthenticated');
    if (!isAdmin) {
      navigate('/admin-login');
    }
  }, [navigate]);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load real users from Supabase
  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } else if (data) {
      setUsers(data.users.map((user: any) => ({
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        email: user.email,
        balance: user.user_metadata?.balance || 0,
        frozen: user.user_metadata?.frozen || false,
        verified: user.email_confirmed_at ? true : false,
        created_at: user.created_at
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();

    // Realtime subscriptions for new users
    const channel = supabase.channel('admin-users')
      .on('presence', { event: 'sync' }, () => {
        loadUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [editName, setEditName] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFreezeToggle = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (window.confirm(`Are you sure you want to ${user.frozen ? 'UNFREEZE' : 'FREEZE'} ${user.name}?`)) {
      setUsers(users.map(u => {
        if (u.id === userId) {
          const newFrozen = !u.frozen;
          toast.success(newFrozen ? `Account frozen for ${u.name}` : `Account unfrozen for ${u.name}`);
          console.log(`[AUDIT LOG] Admin ${localStorage.getItem('adminEmail')} ${newFrozen ? 'FROZE' : 'UNFROZE'} account: ${user.email} at ${new Date().toISOString()}`);
          return { ...u, frozen: newFrozen };
        }
        return u;
      }));
    }
  };

  const handleAddMoney = (userId: number) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (window.confirm(`⚠️ CONFIRM: Add $${numAmount.toLocaleString()} to ${user.name}?\n\nThis action will be logged.`)) {
      setUsers(users.map(u => {
        if (u.id === userId) {
          const newBalance = u.balance + numAmount;
          toast.success(`Added $${numAmount.toLocaleString()} to ${u.name}'s account`);
          console.log(`[AUDIT LOG] Admin ${localStorage.getItem('adminEmail')} CREDITED $${numAmount} to ${user.email}. Old balance: $${u.balance} | New balance: $${newBalance} at ${new Date().toISOString()}`);
          return { ...u, balance: newBalance };
        }
        return u;
      }));
      setAmount('');
      setSelectedUser(null);
    }
  };

  const handleUpdateName = (userId: number) => {
    if (!editName.trim()) {
      toast.error("Please enter a valid name");
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    setUsers(users.map(u => {
      if (u.id === userId) {
        toast.success(`Updated name to: ${editName}`);
        console.log(`[AUDIT LOG] Admin ${localStorage.getItem('adminEmail')} CHANGED NAME from "${user.name}" to "${editName}" for ${user.email} at ${new Date().toISOString()}`);
        return { ...u, name: editName };
      }
      return u;
    }));
    setEditName('');
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
          <p className="text-muted-foreground">Test mode - Full admin permissions enabled</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive" className="text-base px-4 py-1">⚠️ TESTING MODE</Badge>
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
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Manage all user accounts. You have full permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center mb-4">
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users by name or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">${user.balance.toLocaleString()}</TableCell>
                      <TableCell>
                        {user.frozen ? (
                          <Badge variant="destructive">FROZEN</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant={user.frozen ? "default" : "destructive"}
                            onClick={() => handleFreezeToggle(user.id)}
                          >
                            {user.frozen ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                            {user.frozen ? "Unfreeze" : "Freeze"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedUser(user.id)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedUser(user.id);
                              setEditName(user.name);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedUser && (
                <Card className="mt-6 border-dashed border-2 border-amber-500">
                  <CardHeader>
                    <CardTitle>Admin Actions - User #{selectedUser}</CardTitle>
                    <CardDescription>Unlimited testing permissions enabled</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Add Money (any amount)</Label>
                        <Input 
                          type="number" 
                          placeholder="Enter amount" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => handleAddMoney(selectedUser)}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Add Money
                        </Button>
                        <p className="text-xs text-muted-foreground">You can add ANY amount - even 5,000,000</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Edit User Name</Label>
                        <Input 
                          placeholder="Enter new name" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                        <Button 
                          className="w-full"
                          onClick={() => handleUpdateName(selectedUser)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Update Name
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      variant="secondary"
                      onClick={() => setSelectedUser(null)}
                      className="mt-2"
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>View and manage all system transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">Transaction log module ready for testing</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>All admin actions and user activity</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">Audit logging module ready for testing</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Global banking system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Disable all user transactions</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">Allow new users to sign up</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Test Mode</Label>
                  <p className="text-sm text-muted-foreground">Unlimited admin permissions, no real transactions</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}