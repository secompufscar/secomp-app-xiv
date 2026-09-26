import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_TOKEN_KEY = "userToken";
const REFRESH_TOKEN_KEY = "refreshToken";

async function getItem(key: string) {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function removeItem(key: string) {
  if (Platform.OS === "web") return AsyncStorage.removeItem(key);
  await SecureStore.deleteItemAsync(key);
  await AsyncStorage.removeItem(key);
}

export async function getAuthToken() {
  if (Platform.OS === "web") return AsyncStorage.getItem(AUTH_TOKEN_KEY);

  const secureToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  if (secureToken) return secureToken;

  // Migra a sessão existente na primeira execução após a atualização.
  const legacyToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (!legacyToken) return null;

  await setAuthToken(legacyToken);
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  return legacyToken;
}

export async function setAuthToken(token: string) {
  return setItem(AUTH_TOKEN_KEY, token);
}

export async function removeAuthToken() {
  return removeItem(AUTH_TOKEN_KEY);
}

export function getRefreshToken() {
  return getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  return setItem(REFRESH_TOKEN_KEY, token);
}

export function removeRefreshToken() {
  return removeItem(REFRESH_TOKEN_KEY);
}

export async function setSessionTokens(token: string, refreshToken: string) {
  await Promise.all([setAuthToken(token), setRefreshToken(refreshToken)]);
}

export async function removeSessionTokens() {
  await Promise.all([removeAuthToken(), removeRefreshToken()]);
}
