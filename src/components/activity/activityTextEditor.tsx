import { useRef, useState } from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { colors } from "../../styles/colors";
import { useAuth } from "../../hooks/AuthContext";
import { updateActivity } from "../../services/activities";
import Button from "../button/button";
import { Input } from "../input/input";

interface Props {
  activity: Activity;
  onCancel: () => void;
  onSaved: (activity: Activity) => void;
}

export default function ActivityTextEditor({ activity, onCancel, onSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(activity.nome);
  const [speakerName, setSpeakerName] = useState(activity.palestranteNome);
  const [details, setDetails] = useState(activity.detalhes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);

  const handleSave = async () => {
    if (saving.current || user?.tipo !== "ADMIN") return;

    const nome = name.trim();
    const palestranteNome = speakerName.trim();
    if (!nome || !palestranteNome) {
      setError("Preencha o título da atividade e o nome do apresentador.");
      return;
    }
    if (nome.length > 255 || palestranteNome.length > 255) {
      setError("Cada nome deve ter no máximo 255 caracteres.");
      return;
    }
    if (details.length > 500) {
      setError("Os detalhes devem ter no máximo 500 caracteres.");
      return;
    }

    saving.current = true;
    setIsSaving(true);
    setError("");
    try {
      const updated = await updateActivity(activity.id, { nome, palestranteNome, detalhes: details });
      onSaved({ ...activity, ...updated });
    } catch (error: any) {
      setError(error.response?.data?.message || "Não foi possível salvar. Tente novamente.");
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving.current) onCancel();
      }}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-6 py-8">
        <View className="w-full max-w-lg rounded-lg bg-blue-900 p-6" style={{ maxHeight: "100%" }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" className="text-white text-xl font-poppinsSemiBold mb-5">
              Editar atividade
            </Text>
            <Text className="text-gray-400 text-sm font-inter mb-2">Título da atividade</Text>
            <Input>
              <Input.Field
                accessibilityLabel="Título da atividade"
                value={name}
                onChangeText={setName}
                editable={!isSaving}
                maxLength={255}
                autoFocus
              />
            </Input>
            <Text className="text-gray-400 text-sm font-inter mt-3 mb-2">Nome do apresentador</Text>
            <Input>
              <Input.Field
                accessibilityLabel="Nome do apresentador"
                value={speakerName}
                onChangeText={setSpeakerName}
                editable={!isSaving}
                maxLength={255}
              />
            </Input>
            <Text className="text-gray-400 text-sm font-inter mt-3 mb-2">Detalhes da atividade</Text>
            <TextInput
              accessibilityLabel="Detalhes da atividade"
              value={details}
              onChangeText={setDetails}
              editable={!isSaving}
              maxLength={500}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder="Descreva a atividade"
              placeholderTextColor={colors.border}
              className="w-full min-h-[128px] px-5 py-4 text-white text-sm font-inter bg-background border border-border rounded-lg outline-none"
            />
            <Text className="text-gray-400 text-xs font-inter mt-2">{details.length}/500 caracteres</Text>
            {!!error && (
              <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="text-danger font-inter mt-3">
                {error}
              </Text>
            )}
            <View className="flex-row flex-wrap gap-3 mt-6">
              <Button
                title="Cancelar"
                accessibilityRole="button"
                bgColor="bg-gray-700"
                className="flex-1 min-w-[120px]"
                disabled={isSaving}
                onPress={onCancel}
              />
              <Button
                title="Salvar"
                accessibilityRole="button"
                accessibilityLabel="Salvar alterações"
                className="flex-1 min-w-[120px]"
                loading={isSaving}
                disabled={isSaving}
                onPress={handleSave}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
