import { Linking, Platform } from "react-native";

export async function openRequiredUpdate(updateUrl: string) {
  if (Platform.OS === "android") {
    try {
      const module = require("../../modules/play-in-app-update").default;
      const started = await module.startImmediateUpdate();
      if (started) return;
    } catch (error) {
      console.error("Atualização imediata indisponível; abrindo a loja:", error);
    }
  }

  await Linking.openURL(updateUrl);
}
