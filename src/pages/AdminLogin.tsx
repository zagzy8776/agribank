import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

// TEST ADMIN CREDENTIALS
const ADMIN_EMAIL = "admin@agribank.com";
const ADMIN_PASSWORD = "admin123";

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem('adminAuthenticated', 'true');
      toast.success("Admin login successful");
      navigate('/dashboard/admin');
    } else {
      toast.error("Invalid admin credentials");
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
          <CardDescription>Restricted admin area - Authorized personnel only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <Input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
              />
            </div>
            <div className="space-y-2">
              <Label>Admin Password</Label>
              <Input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
              Login as Administrator
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Test credentials: admin@agribank.com / admin123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}