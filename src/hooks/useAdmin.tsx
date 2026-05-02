import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AdminCtx {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

const AdminCtx = createContext<AdminCtx | null>(null);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const adminFlag = localStorage.getItem('adminAuthenticated');
    if (adminFlag) {
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  return (
    <AdminCtx.Provider value={{
      isAdmin,
      loading,
      error,
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
