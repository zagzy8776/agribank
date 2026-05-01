import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AdminCtx {
  isAdmin: boolean;
  adminUser: User | null;
  serviceToken: string | null;
  loading: boolean;
  error: string | null;
  getServiceToken: () => Promise<string | null>;
}

const AdminCtx = createContext<AdminCtx | null>(null);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [serviceToken, setServiceToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check localStorage admin flag (temporary - replace with real admin role later)
  useEffect(() => {
    const adminFlag = localStorage.getItem('adminAuthenticated');
    if (adminFlag) {
      setIsAdmin(true);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const getServiceToken = async (): Promise<string | null> => {
    if (serviceToken) return serviceToken;

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=client_credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          scope: 'service_role',
        }),
      });

      if (!response.ok) throw new Error('Failed to get service token');

      const data = await response.json();
      const token = data.access_token;
      setServiceToken(token);
      return token;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  return (
    <AdminCtx.Provider value={{
      isAdmin,
      adminUser,
      serviceToken,
      loading,
      error,
      getServiceToken,
    }}>
      {children}
    </AdminCtx.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminCtx);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
};

