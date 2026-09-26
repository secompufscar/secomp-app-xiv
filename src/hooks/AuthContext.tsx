import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { setGlobalSignOut } from "../utils/authHelper";
import api from "../services/api";
import { getAuthToken, getRefreshToken, removeSessionTokens, setSessionTokens } from "../services/secureStorage";
import { logout } from "../services/users";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (data: User, token: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (data: User) => Promise<void>; 
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = useCallback(async (data: User, token: string, refreshToken: string) => {
    try {
      await setSessionTokens(token, refreshToken);
      setUser(data);
    } catch (error) {
      console.error("Erro no signIn:", error);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          await logout(refreshToken);
        } catch (error) {
          console.error("Erro ao revogar sessão remota:", error);
        }
      }
      await removeSessionTokens();
      setUser(null);
    } catch (error) {
      console.error("Erro ao fazer sign out:", error);
    }
  }, []);

  const updateUser = useCallback(async (data: User) => {
    setUser(data);
  }, []);

  useEffect(() => {
    setGlobalSignOut(signOut);
  }, [signOut]);

  // Recupera a sessão do armazenamento seguro (e migra o token legado uma vez).
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {      
        const storedToken = await getAuthToken();

        if (storedToken) {
          const response = await api.get("/users/me");
          setUser(response.data);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
        await signOut();
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    signIn,
    signOut,
    updateUser,
  }), [user, loading, signIn, signOut, updateUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para acessar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");  
  }

  return context;
};
