import { Linking, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AppVersionPolicy } from "../../services/appVersion";
import { openRequiredUpdate } from "../../services/inAppUpdate";

export default function UpdateRequiredScreen({ policy }: { policy: AppVersionPolicy }) {
  return (
    <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center px-6">
      <View className="w-full max-w-[440px] rounded-xl border border-blue-500/50 bg-background p-6">
        <Text className="text-white text-2xl font-poppinsSemiBold mb-3">Atualização necessária</Text>
        <Text className="text-gray-400 font-inter leading-6 mb-6">{policy.message}</Text>
        <Text className="text-blue-200 font-inter text-sm mb-1">Versão mínima: {policy.minimumVersion}</Text>
        <Text className="text-blue-200 font-inter text-sm mb-6">Versão disponível: {policy.latestVersion}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => openRequiredUpdate(policy.updateUrl)}
          className="w-full h-14 items-center justify-center rounded-lg bg-blue-500 active:opacity-80"
        >
          <Text className="text-white text-base font-poppinsMedium">Atualizar aplicativo</Text>
        </Pressable>
        <View className="flex-row justify-center gap-6 mt-5">
          <Pressable onPress={() => Linking.openURL("mailto:coordenacao@secompufscar.com.br")}>
            <Text className="text-blue-200 font-inter">Suporte</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL("https://app.secompufscar.com.br/politica-privacidade.html")}>
            <Text className="text-blue-200 font-inter">Privacidade</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
