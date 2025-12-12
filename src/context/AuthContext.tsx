// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";

type User = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

type SignupMeta = {
  first_name?: string;
  last_name?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Error | null>;
  signUp: (
    email: string,
    password: string,
    meta?: SignupMeta
  ) => Promise<Error | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // -------------------------
  // LOAD SESSION ON APP START
  // -------------------------
  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("INITIAL SESSION:", session);

      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? undefined,
          first_name: u.user_metadata?.first_name,
          last_name: u.user_metadata?.last_name,
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    loadSession();

    // -------------------------
    // LISTEN FOR LOGIN / LOGOUT
    // -------------------------
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AUTH STATE CHANGE:", { event, session });

      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? undefined,
          first_name: u.user_metadata?.first_name,
          last_name: u.user_metadata?.last_name,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ------------------------------------
  // SIGN IN (FIXED: now updates user)
  // ------------------------------------
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("SIGN-IN RESULT:", { data, error });

    if (!error && data?.user) {
      const u = data.user;
      setUser({
        id: u.id,
        email: u.email ?? undefined,
        first_name: u.user_metadata?.first_name,
        last_name: u.user_metadata?.last_name,
      });
    }

    return error ?? null;
  };

  // ------------------------------------
  // SIGN UP (with metadata)
  // ------------------------------------
  const signUp = async (
    email: string,
    password: string,
    meta?: SignupMeta
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...(meta || {}),
        },
      },
    });

    console.log("SIGN-UP RESULT:", { data, error });
    return error ?? null;
  };

  // ------------------------------------
  // SIGN OUT
  // ------------------------------------
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
