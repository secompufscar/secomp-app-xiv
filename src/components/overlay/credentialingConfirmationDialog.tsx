import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { colors } from "../../styles/colors";

import { matchesParticipantName } from "./credentialingRemovalDialog";

interface Props {
  name: string;
  typedName: string;
  onChangeName: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: string | null;
}

export default function CredentialingConfirmationDialog({ name, typedName, onChangeName, onCancel, onConfirm, busy, error }: Props) {
  const { height, width } = useWindowDimensions();
  const confirmed = matchesParticipantName(typedName, name);
  return (
    <Modal
      transparent
      accessibilityLabel="Confirmar credenciamento do participante"
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
              Credenciar participante
            </Text>
            <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 16 }}>
              Isso registra a presença de {name} no credenciamento da edição atual. A pessoa precisa ter uma inscrição válida nessa edição.
            </Text>
            <Text style={{ color: colors.white, fontFamily: "Inter_500Medium", lineHeight: 22, marginBottom: 8 }}>
              Digite o nome completo exatamente como aparece:
            </Text>
            <Text selectable style={{ color: colors.white, fontFamily: "Inter_500Medium", lineHeight: 22, marginBottom: 12 }}>
              {name}
            </Text>
            <TextInput
              accessibilityLabel="Nome para confirmar credenciamento"
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
              accessibilityLabel="Cancelar credenciamento"
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
              accessibilityLabel="Confirmar credenciamento"
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
                backgroundColor: colors.blue[500],
                borderRadius: 8,
                opacity: !confirmed || busy ? 0.5 : 1,
              }}
            >
              <Text style={{ color: colors.white, fontFamily: "Inter_500Medium" }}>{busy ? "Credenciando..." : "Credenciar"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
