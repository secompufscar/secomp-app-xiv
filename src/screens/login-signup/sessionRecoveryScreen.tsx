import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { colors } from "../../styles/colors";

type Props = { message: string; onRetry: () => Promise<void> };

export default function SessionRecoveryScreen({ message, onRetry }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <View style={{ width: "100%", maxWidth: 440 }}>
          <Text accessibilityRole="header" style={{ color: colors.white, fontFamily: "Poppins_600SemiBold", fontSize: 22, lineHeight: 32, marginBottom: 16 }}>
            Vamos recuperar sua sessão
          </Text>
          <Text accessibilityRole="alert" style={{ color: colors.default, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
            {message}
          </Text>
          <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22, marginBottom: 28 }}>
            Seus dados de acesso foram preservados.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => { void onRetry(); }} style={({ pressed }) => ({ minHeight: 48, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.green, opacity: pressed ? 0.8 : 1 })}>
            <Text style={{ color: colors.background, fontFamily: "Inter_500Medium", fontSize: 16, lineHeight: 24 }}>Tentar novamente</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
