import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback, useMemo } from "react";
import { setGlobalSignOut } from "../utils/authHelper";
import api from "../services/api";
import { getAuthToken, getRefreshToken, removeSessionTokens, setSessionTokens } from "../services/secureStorage";
import { logout } from "../services/users";
import { isInvalidSessionError } from "../utils/sessionErrors";
import { Platform } from "react-native";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  sessionError: string | null;
  retrySession: () => Promise<void>;
  canPreviewParticipant: boolean;
  isParticipantView: boolean;
  canUseAdminTools: boolean;
  setParticipantView: (enabled: boolean) => void;
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
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [participantViewRequested, setParticipantViewRequested] = useState(false);
  const restorePromise = useRef<Promise<void> | null>(null);
  const sessionGeneration = useRef(0);
  const canPreviewParticipant = Platform.OS === "web" && user?.tipo === "ADMIN";
  const isParticipantView = canPreviewParticipant && participantViewRequested;
  const canUseAdminTools = user?.tipo === "ADMIN" && !isParticipantView;
  const setParticipantView = useCallback((enabled: boolean) => {
    setParticipantViewRequested(canPreviewParticipant && enabled);
  }, [canPreviewParticipant]);

  useEffect(() => { setParticipantViewRequested(false); }, [user?.id, user?.tipo]);

  const resetAuthState = useCallback(async () => {
    sessionGeneration.current++;
    setUser(null);
    setParticipantViewRequested(false);
    setSessionError(null);
    setLoading(false);
  }, []);

  const signIn = useCallback(async (data: User, token: string, refreshToken: string) => {
    try {
      sessionGeneration.current++;
      await setSessionTokens(token, refreshToken);
      setUser(data);
      setParticipantViewRequested(false);
      setSessionError(null);
      setLoading(false);
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
      await resetAuthState();
    } catch (error) {
      console.error("Erro ao fazer sign out:", error);
    }
  }, [resetAuthState]);

  const updateUser = useCallback(async (data: User) => {
    setUser(data);
  }, []);

  useEffect(() => {
    // The interceptor already removes invalid tokens; do not revoke remotely here.
    setGlobalSignOut(resetAuthState);
  }, [resetAuthState]);

  // Recupera a sessão do armazenamento seguro (e migra o token legado uma vez).
  const retrySession = useCallback(() => {
    if (restorePromise.current) return restorePromise.current;
    const generation = sessionGeneration.current;
    setLoading(true);
    setSessionError(null);
    const restore = async () => {
      try {      
        const storedToken = await getAuthToken();
        const storedRefreshToken = await getRefreshToken();
        if (generation !== sessionGeneration.current) return;
        if (storedToken || storedRefreshToken) {
          const response = await api.get("/users/me", { timeout: 10000 });
          if (generation === sessionGeneration.current) setUser(response.data);
        } else if (generation === sessionGeneration.current) {
          setUser(null);
        }
      } catch (error) {
        if (generation !== sessionGeneration.current) return;
        if (isInvalidSessionError(error)) {
          try {
            await removeSessionTokens();
            await resetAuthState();
          } catch {
            setSessionError("Não foi possível concluir a recuperação da sessão. Tente novamente.");
          }
        } else {
          setSessionError("Não foi possível recuperar sua sessão agora. Verifique sua conexão e tente novamente.");
        }
      } finally {
        if (generation === sessionGeneration.current) setLoading(false);
      }
    };
    const pending = restore().finally(() => {
      if (restorePromise.current === pending) restorePromise.current = null;
    });
    restorePromise.current = pending;
    return pending;
  }, [resetAuthState]);

  useEffect(() => { void retrySession(); }, [retrySession]);

  const contextValue = useMemo(() => ({
    user,
    loading,
    sessionError,
    retrySession,
    canPreviewParticipant,
    isParticipantView,
    canUseAdminTools,
    setParticipantView,
    signIn,
    signOut,
    updateUser,
  }), [user, loading, sessionError, retrySession, canPreviewParticipant, isParticipantView, canUseAdminTools, setParticipantView, signIn, signOut, updateUser]);

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
