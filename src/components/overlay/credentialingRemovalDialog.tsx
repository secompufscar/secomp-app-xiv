import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { colors } from "../../styles/colors";

export function matchesParticipantName(typed: string, name: string): boolean {
  return name.trim().length > 0 && typed.trim().normalize("NFC") === name.trim().normalize("NFC");
}

interface Props {
  name: string;
  typedName: string;
  onChangeName: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: string | null;
}

export default function CredentialingRemovalDialog({ name, typedName, onChangeName, onCancel, onConfirm, busy, error }: Props) {
  const { height, width } = useWindowDimensions();
  const confirmed = matchesParticipantName(typedName, name);
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, padding: 16, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 520,
            maxHeight: Math.max(160, height - 32),
            borderRadius: 12,
            backgroundColor: colors.blue[900],
            padding: width < 400 ? 16 : 24,
            gap: 20,
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
            <Text accessibilityRole="header" style={{ color: colors.white, fontFamily: "Poppins_600SemiBold", fontSize: 18, marginBottom: 12 }}>
              Excluir do credenciamento
            </Text>
            <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 16 }}>
              Isso remove o vínculo de {name} com esta atividade de credenciamento e reverte os pontos dessa presença. A conta e a inscrição no evento
              são mantidas.
            </Text>
            <Text style={{ color: colors.white, fontFamily: "Inter_500Medium", lineHeight: 22, marginBottom: 8 }}>
              Digite o nome completo exatamente como aparece:
            </Text>
            <Text selectable style={{ color: colors.white, fontFamily: "Inter_500Medium", lineHeight: 22, marginBottom: 12 }}>
              {name}
            </Text>
            <TextInput
              accessibilityLabel="Nome para confirmar exclusão"
              value={typedName}
              onChangeText={onChangeName}
              editable={!busy}
              autoCorrect={false}
              autoCapitalize="none"
              style={{
                minHeight: 48,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                color: colors.white,
                padding: 12,
                fontFamily: "Inter_400Regular",
              }}
            />
            {error && (
              <Text accessibilityRole="alert" style={{ color: colors.danger, fontFamily: "Inter_400Regular", lineHeight: 22, marginTop: 12 }}>
                {error}
              </Text>
            )}
          </ScrollView>
          <View style={{ flexDirection: width < 400 ? "column" : "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar exclusão"
              disabled={busy}
              onPress={onCancel}
              style={{
                minHeight: 48,
                flex: width < 400 ? undefined : 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                opacity: busy ? 0.5 : 1,
              }}
            >
              <Text style={{ color: colors.white, fontFamily: "Inter_500Medium" }}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirmar exclusão do credenciamento"
              accessibilityState={{ disabled: !confirmed || busy, busy }}
              disabled={!confirmed || busy}
              onPress={() => {
                if (confirmed && !busy) onConfirm();
              }}
              style={{
                minHeight: 48,
                flex: width < 400 ? undefined : 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
                backgroundColor: colors.danger,
                borderRadius: 8,
                opacity: !confirmed || busy ? 0.5 : 1,
              }}
            >
              <Text style={{ color: colors.white, fontFamily: "Inter_500Medium" }}>{busy ? "Excluindo..." : "Excluir"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
