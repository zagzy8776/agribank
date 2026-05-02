import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { registerUser, signInUser, getUserById, type User } from "@/lib/db";

type Session = { userId: string; email: string };

interface AuthCtx {
  user: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem('agribank_session');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Verify user still exists in database
        getUserById(parsed.userId).then(u => {
          if (u && !u.frozen) setUser(parsed);
          else sessionStorage.removeItem('agribank_session');
          setLoading(false);
        }).catch(() => {
          setUser(parsed); // Fallback if API unreachable
          setLoading(false);
        });
      } catch {
        sessionStorage.removeItem('agribank_session');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!email.trim() || password.length < 8) {
      throw new Error("Enter a valid email and password (min 8 chars)");
    }
    const newUser = await registerUser(email, password, fullName);
    const session: Session = { userId: newUser.id, email: newUser.email };
    sessionStorage.setItem('agribank_session', JSON.stringify(session));
    setUser(session);
  };

  const signIn = async (email: string, password: string) => {
    if (!email.trim() || password.length < 4) {
      throw new Error("Enter a valid email and password");
    }
    const found = await signInUser(email, password);
    if (found.frozen) throw new Error("This account has been frozen. Contact support.");
    const session: Session = { userId: found.id, email: found.email };
    sessionStorage.setItem('agribank_session', JSON.stringify(session));
    setUser(session);
  };

  const signOut = () => {
    sessionStorage.removeItem('agribank_session');
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);