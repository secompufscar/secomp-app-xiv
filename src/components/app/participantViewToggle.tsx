import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useAuth } from "../../hooks/AuthContext";
import { colors } from "../../styles/colors";

export default function ParticipantViewToggle() {
  const { canPreviewParticipant, isParticipantView, setParticipantView } = useAuth();
  const { width } = useWindowDimensions();
  if (!canPreviewParticipant) return null;
  const compact = width < 600;
  const label = isParticipantView ? "Voltar à visão administrativa" : "Visão do participante";

  return (
    <View style={{ width: "100%", flexShrink: 0, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ width: "100%", maxWidth: 1000, alignSelf: "center", padding: 16, gap: 12, flexDirection: compact ? "column" : "row", alignItems: compact ? "stretch" : "center" }}>
        <View style={{ flex: compact ? undefined : 1 }}>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.white, fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 22 }}>
            {isParticipantView ? "Visão do participante" : "Visão administrativa"}
          </Text>
          {isParticipantView && <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 20 }}>Prévia com seus dados. Inscrições e edições desativadas.</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setParticipantView(!isParticipantView)} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, justifyContent: "center", alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: colors.green, opacity: pressed ? 0.8 : 1 })}>
          <Text style={{ color: colors.green, fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 22, textAlign: "center" }}>{label}</Text>
        </Pressable>
      </View>
    </View>
  );
}
