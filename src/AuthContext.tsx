import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { firebaseAuth, googleProvider } from "./firebase";
import type { FirebaseUser } from "./firebase";

interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    firebaseAuth.getRedirectResult().catch((reason: unknown) => {
      console.error(reason);
      setError("Не удалось завершить вход через Google.");
    });

    return firebaseAuth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    loginWithGoogle: async () => {
      setError(null);
      await firebaseAuth.signInWithRedirect(googleProvider);
    },
    logout: () => firebaseAuth.signOut(),
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
