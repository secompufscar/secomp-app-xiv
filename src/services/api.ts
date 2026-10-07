import axios from "axios";
import { callGlobalSignOut } from "../utils/authHelper";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getAuthToken, getRefreshToken, removeSessionTokens, setSessionTokens } from "./secureStorage";
import { callGlobalRequireUpdate } from "../utils/updateHelper";
import { InvalidSessionError, isInvalidSessionError } from "../utils/sessionErrors";

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

async function currentSessionToken() {
  const token = await getAuthToken();
  if (!token) throw new Error("A sessão mudou durante a requisição");
  return token;
}

async function renewAccessToken(failedToken: string | null) {
  const renew = async () => {
    // A delayed 401 (or another tab) may refer to a token already replaced.
    const currentToken = await getAuthToken();
    if (currentToken && currentToken !== failedToken) return currentToken;
    const refreshToken = await getRefreshToken();

    let response;
    try {
      if (!refreshToken) throw new InvalidSessionError("Refresh token ausente");
      response = await refreshClient.post("/users/refresh", { refreshToken }, { headers: appHeaders() });
    } catch (error) {
      // A logout or new login while the request was pending owns the stored session.
      if (await getRefreshToken() !== refreshToken || await getAuthToken() !== currentToken) {
        return currentSessionToken();
      }
      const invalidRefresh = axios.isAxiosError(error) && error.response?.status === 400
        && error.response.data?.errorCode === "VALIDATION_ERROR"
        && Array.isArray(error.response.data.errors)
        && error.response.data.errors.some((issue: { path?: unknown[] }) => issue.path?.[0] === "refreshToken");
      if (isInvalidSessionError(error) || invalidRefresh) {
        await removeSessionTokens();
        await callGlobalSignOut();
        throw new InvalidSessionError("Sessão inválida; faça login novamente");
      }
      throw error;
    }
    if (await getRefreshToken() !== refreshToken || await getAuthToken() !== currentToken) {
      return currentSessionToken();
    }
    await setSessionTokens(response.data.token, response.data.refreshToken);
    return response.data.token as string;
  };

  // Web Locks coordinate tabs of the same origin; native clients keep single-flight.
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("secomp-session-refresh", renew);
  }
  return renew();
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
    const isSessionRoute = /\/users\/(?:login|refresh|logout|signup|sendForgotPasswordEmail|updatePassword|confirmation)(?:\/|\?|$)/.test(originalRequest?.url ?? "");
    // Invalid credentials on a public auth operation do not invalidate an existing login.
    if (status === 401 && isSessionRoute) return Promise.reject(error);
    const failedToken = String(originalRequest?.headers?.Authorization ?? "").replace(/^Bearer /, "") || null;

    if (status === 401 && originalRequest && !originalRequest._retry && !isSessionRoute) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= renewAccessToken(failedToken).finally(() => { refreshPromise = null; });
        const token = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 426
          && refreshError.response.data?.code === "APP_UPDATE_REQUIRED") {
          callGlobalRequireUpdate(refreshError.response.data);
        }
        // Renewal handles confirmed invalidity; temporary errors preserve credentials.
        return Promise.reject(refreshError);
      }
    }
    if (status === 401 && originalRequest) {
      if (await getAuthToken() !== failedToken) {
        return Promise.reject(new Error("A sessão mudou durante a requisição"));
      }
      await removeSessionTokens();
      await callGlobalSignOut();
    }
    return Promise.reject(error);
  }
);

export default api;
