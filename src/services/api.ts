import axios from "axios";
import { callGlobalSignOut } from "../utils/authHelper";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getAuthToken } from "./secureStorage";
import { callGlobalRequireUpdate } from "../utils/updateHelper";

const api = axios.create({ baseURL: "https://secomp-server-xiv-production.up.railway.app/api/v1", });

// Interceptor de Requisição: Adiciona o token em todas as chamadas
api.interceptors.request.use(
  async (config) => {
    try {
      const userToken = await getAuthToken();

      config.headers["X-App-Platform"] = Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : "web";
      config.headers["X-App-Version"] = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "0.0.0";
      config.headers["X-App-Build"] = Constants.nativeBuildVersion ?? "web";

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
    if (status === 401) {
      await callGlobalSignOut();
    }
    return Promise.reject(error);
  }
);

export default api;
