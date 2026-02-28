import { useState, useEffect, useCallback } from "react";
import { adminAuth } from "@/lib/admin-api";

interface AdminAuthState {
  isChecking: boolean;
  isAuthenticated: boolean;
  expiresAt: string | null;
  error: string | null;
  login: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export function useAdminAuth(): AdminAuthState {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    let mounted = true;
    adminAuth.checkSession()
      .then((data) => {
        if (mounted) {
          setIsAuthenticated(data.valid);
          setExpiresAt(data.expiresAt);
        }
      })
      .catch(() => {
        if (mounted) setIsAuthenticated(false);
      })
      .finally(() => {
        if (mounted) setIsChecking(false);
      });
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (token: string): Promise<boolean> => {
    setError(null);
    try {
      const result = await adminAuth.login(token);
      setIsAuthenticated(true);
      setExpiresAt(result.expiresAt);
      return true;
    } catch (err: any) {
      setError(err.message);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminAuth.logout();
    } catch {}
    setIsAuthenticated(false);
    setExpiresAt(null);
  }, []);

  return { isChecking, isAuthenticated, expiresAt, error, login, logout };
}
