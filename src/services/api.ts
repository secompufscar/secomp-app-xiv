import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callGlobalSignOut } from "../utils/authHelper";

const api = axios.create({ baseURL: "https://secomp-server-xiv-production.up.railway.app/api/v1", });

// Interceptor de Requisição: Adiciona o token em todas as chamadas
api.interceptors.request.use(
  async (config) => {
    try {
      const userToken = await AsyncStorage.getItem("userToken");

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
    if (status === 401) {
      await callGlobalSignOut();
    }
    return Promise.reject(error);
  }
);

export default api;