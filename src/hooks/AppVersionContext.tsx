import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getAppVersionPolicy, AppVersionPolicy } from "../services/appVersion";
import { setGlobalRequireUpdate } from "../utils/updateHelper";

interface AppVersionContextData {
  checkingVersion: boolean;
  requiredUpdate: AppVersionPolicy | null;
}

const AppVersionContext = createContext<AppVersionContextData | undefined>(undefined);

export function AppVersionProvider({ children }: { children: ReactNode }) {
  const [checkingVersion, setCheckingVersion] = useState(true);
  const [requiredUpdate, setRequiredUpdate] = useState<AppVersionPolicy | null>(null);

  useEffect(() => {
    setGlobalRequireUpdate(setRequiredUpdate);
    getAppVersionPolicy()
      .then(policy => {
        if (policy.force) setRequiredUpdate(policy);
      })
      .catch(error => console.error("Não foi possível verificar a versão do aplicativo:", error))
      .finally(() => setCheckingVersion(false));
  }, []);

  const value = useMemo(() => ({ checkingVersion, requiredUpdate }), [checkingVersion, requiredUpdate]);
  return <AppVersionContext.Provider value={value}>{children}</AppVersionContext.Provider>;
}

export function useAppVersion() {
  const context = useContext(AppVersionContext);
  if (!context) throw new Error("useAppVersion deve ser usado dentro de AppVersionProvider");
  return context;
}
