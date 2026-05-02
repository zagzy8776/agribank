import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error('Enter credentials'); return; }
    
    setLoading(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adminLogin',
          data: { email: email.trim().toLowerCase(), password },
        }),
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Invalid admin credentials');
      }
      
      localStorage.setItem('adminAuthenticated', 'true');
      toast.success("Admin access granted");
      navigate('/dashboard/admin', { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Access denied");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md mx-4 border-red-400">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <ShieldAlert className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl">ADMIN LOGIN</CardTitle>
          <CardDescription>Restricted area — authorized personnel only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@agribank.com" />
            </div>
            <div className="space-y-2">
              <Label>Admin Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" />
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login as Administrator"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}