import { Platform } from "react-native";
import api from "./api";

export interface AppVersionPolicy {
  platform: "android" | "ios" | "web";
  minimumVersion: string;
  latestVersion: string;
  currentVersion: string | null;
  updateUrl: string;
  updateRequired: boolean;
  force: boolean;
  message: string;
}

export async function getAppVersionPolicy(): Promise<AppVersionPolicy> {
  const platform = Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : "web";
  const response = await api.get<AppVersionPolicy>("/app/version", {
    params: { platform },
    timeout: 8000,
  });
  return response.data;
}
