import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { registerUser, signInUser, type MockUser } from "@/lib/mockStore";

type LocalUser = {
  id: string;
  email: string;
};

interface AuthCtx {
  user: LocalUser | null;
  session: null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session] = useState<null>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("localAuthUser");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem("localAuthUser");
      }
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!email.trim() || password.length < 8) {
      throw new Error("Enter a valid email and password (min 8 chars)");
    }
    // Use centralized mock store — creates profile + account + welcome bonus
    const newUser: MockUser = registerUser(email, password, fullName);
    const loggedInUser: LocalUser = {
      id: newUser.id,
      email: newUser.email,
    };
    localStorage.setItem("localAuthUser", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const signIn = async (email: string, password: string) => {
    if (!email.trim() || password.length < 4) {
      throw new Error("Enter a valid email and password");
    }
    // Authenticate against mock store
    const foundUser: MockUser = signInUser(email, password);
    const loggedInUser: LocalUser = {
      id: foundUser.id,
      email: foundUser.email,
    };
    localStorage.setItem("localAuthUser", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const signOut = async () => {
    localStorage.removeItem("localAuthUser");
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);