import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'financas_user';
const HOUSEHOLD_KEY = 'financas_household_id';
const VALUES_HIDDEN_KEY = 'financas_values_hidden';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [householdId, setHouseholdIdState] = useState(() => {
    return localStorage.getItem(HOUSEHOLD_KEY) || null;
  });

  const [valuesHidden, setValuesHidden] = useState(() => {
    return localStorage.getItem(VALUES_HIDDEN_KEY) === 'true';
  });

  const toggleValuesHidden = useCallback(() => {
    setValuesHidden(prev => {
      const next = !prev;
      localStorage.setItem(VALUES_HIDDEN_KEY, String(next));
      return next;
    });
  }, []);

  // Persiste no localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (householdId) {
      localStorage.setItem(HOUSEHOLD_KEY, householdId);
    } else {
      localStorage.removeItem(HOUSEHOLD_KEY);
    }
  }, [householdId]);

  const setHouseholdId = useCallback((id) => {
    setHouseholdIdState(id);
  }, []);

  const clearHousehold = useCallback(() => {
    setHouseholdIdState(null);
    localStorage.removeItem(HOUSEHOLD_KEY);
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    // Sync household_id from login response
    if (userData?.household_id) {
      setHouseholdId(userData.household_id);
    }
  }, [setHouseholdId]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    // Keep household_id — device stays bound to the house
  }, []);

  // Valida sessão - chama no mount de cada página
  // Só desloga em 401/404 (user inválido). 500/503 = server down → mantém.
  const validateSession = useCallback(async () => {
    if (!user) return false;

    try {
      const res = await fetch(`/api/auth/profile/${user.id}`);
      if (res.ok) return true;

      // 401 ou 404 = sessão inválida / user não existe → deslogar
      if (res.status === 401 || res.status === 404) {
        logout();
        return false;
      }

      // 500, 502, 503 = server down → manter sessão (offline)
      return true;
    } catch {
      // Erro de rede (ECONNREFUSED, etc) → API offline → manter sessão
      return true;
    }
  }, [user, logout]);

  // Logga erro e retorna mensagem
  const logError = useCallback(async (source, message, details) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          source,
          message,
          details,
          user_id: user?.id,
        }),
      });
    } catch {
      // Silencioso se a API estiver offline
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      login,
      logout,
      isAuthenticated: !!user,
      validateSession,
      logError,
      householdId,
      setHouseholdId,
      clearHousehold,
      isSuperAdmin: user?.role === 'super_admin',
      isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
      currency: user?.currency || 'BRL',
      currencySymbol: (user?.currency === 'USD' || user?.currency === 'CAD') ? '$' : 
                      (user?.currency === 'EUR') ? '€' : 
                      (user?.currency === 'GBP') ? '£' : 'R$',
      valuesHidden,
      toggleValuesHidden,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
  
export default AuthContext;