import axios from "axios";
import { callGlobalSignOut } from "../utils/authHelper";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getAuthToken, getRefreshToken, removeSessionTokens, setSessionTokens } from "./secureStorage";
import { callGlobalRequireUpdate } from "../utils/updateHelper";

const baseURL = "https://secomp-server-xiv-production.up.railway.app/api/v1";
const api = axios.create({ baseURL });
const refreshClient = axios.create({ baseURL, timeout: 8000 });
let refreshPromise: Promise<string> | null = null;

function appHeaders() {
  return {
    "X-App-Platform": Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : "web",
    "X-App-Version": Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "0.0.0",
    "X-App-Build": Constants.nativeBuildVersion ?? "web",
  };
}

async function renewAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("Refresh token ausente");

  const response = await refreshClient.post("/users/refresh", { refreshToken }, { headers: appHeaders() });
  await setSessionTokens(response.data.token, response.data.refreshToken);
  return response.data.token as string;
}

// Interceptor de Requisição: Adiciona o token em todas as chamadas
api.interceptors.request.use(
  async (config) => {
    try {
      const userToken = await getAuthToken();

      Object.assign(config.headers, appHeaders());

      if (userToken) {
        config.headers.Authorization = `Bearer ${userToken}`;
      }

      return config;
    } catch (error) {
      console.error("Erro no interceptor de requisição ao buscar token:", error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status;
    if (status === 426 && error.response?.data?.code === "APP_UPDATE_REQUIRED") {
      callGlobalRequireUpdate(error.response.data);
    }
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const isSessionRoute = originalRequest?.url?.includes("/users/login")
      || originalRequest?.url?.includes("/users/refresh");

    if (status === 401 && originalRequest && !originalRequest._retry && !isSessionRoute) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= renewAccessToken().finally(() => { refreshPromise = null; });
        const token = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch {
        await removeSessionTokens();
      }
    }
    if (status === 401) {
      await removeSessionTokens();
      await callGlobalSignOut();
    }
    return Promise.reject(error);
  }
);

export default api;
