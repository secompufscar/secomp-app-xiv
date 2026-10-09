import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { useState, useCallback } from "react";
import { ScrollView, View, Text, StatusBar, Platform, ActivityIndicator, Switch, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, ParamListBase, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../styles/colors";
import { Input } from "../../components/input/input";
import { sendPushNotification, sendNotificationToAll } from "../../services/notifications";
import { getActivities } from "../../services/activities";
import BackButton from "../../components/button/backButton";
import Button from "../../components/button/button";
import ErrorOverlay from "../../components/overlay/errorOverlay";
import WarningOverlay from "../../components/overlay/warningOverlay";

type AdminNotificationSendNavigationProp = NativeStackNavigationProp<ParamListBase>;

export default function AdminNotificationSend() {
  const navigation = useNavigation<AdminNotificationSendNavigationProp>();

  const [title, setTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [recipientIdsInput, setRecipientIdsInput] = useState<string>("");
  const [sendToAll, setSendToAll] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [badgeCount, setBadgeCount] = useState<string>("");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedActivityName, setSelectedActivityName] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("Erro");
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  const [warningMessage, setWarningMessage] = useState("Aviso");
  const [warningModalVisible, setWarningModalVisible] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState<boolean>(true);
  const [showActivitiesList, setShowActivitiesList] = useState<boolean>(false);

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      setWarningMessage("Por favor, preencha todos os campos")
      setWarningModalVisible(true);
      return;
    }

    let recipientIds: string[] = [];
    if (!sendToAll) {
      if (!recipientIdsInput.trim()) {
        setWarningMessage("Por favor, insira os IDs dos destinatários ou selecione 'Enviar para todos'.")
        setWarningModalVisible(true);
        return;
      }

      recipientIds = recipientIdsInput.split(',').map(id => id.trim()).filter(id => id);
      if (recipientIds.length === 0) {
        setWarningMessage("Nenhum ID de destinatário válido encontrado.")
        setWarningModalVisible(true);
        return;
      }
    }

    const parsedBadge = badgeCount.trim() ? parseInt(badgeCount, 10) : undefined;
    if (badgeCount.trim() && (isNaN(parsedBadge!) || parsedBadge! < 0)) {
      setWarningMessage("O número do Badge deve ser um valor numérico não negativo.")
      setWarningModalVisible(true);
      return;
    }

    const data = selectedActivityId ? { activityId: selectedActivityId } : undefined;

    setIsLoading(true);

    try {
      if (sendToAll) {
        await sendNotificationToAll({ title, message, data, sound: soundEnabled, badge: parsedBadge });
      } else {
        await sendPushNotification({ title, message, recipientIds, data, sound: soundEnabled, badge: parsedBadge });
      }

      setTitle("");
      setMessage("");
      setRecipientIdsInput("");
      setBadgeCount("");
      setSendToAll(false);
      setSoundEnabled(true);
      setSelectedActivityId(null);
      setSelectedActivityName(null);
      navigation.goBack();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Falha ao enviar a notificação.";
      setErrorMessage(errorMessage);
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const fetchActivities = async () => {
        setActivitiesLoading(true);
        try {
          const acts = await getActivities();
          if (!active) return;
          setActivities(Array.isArray(acts) ? acts : []);
        } catch (err) {
          console.error("Erro ao buscar atividades:", err);
          if (active) setActivities([]);
        } finally {
          if (active) setActivitiesLoading(false);
        }
      };

      fetchActivities();
      return () => { active = false; };
    }, [])
  );

  const handleSelectActivity = (act: any) => {
    setSelectedActivityId(String(act?.id ?? ""));
    setSelectedActivityName(String(act?.nome ?? act?.title ?? "Atividade"));
    setShowActivitiesList(false);
  };

  // Lista de atividades
  const renderActivityItem = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => handleSelectActivity(item)}
      className={`px-3 py-3 rounded ${selectedActivityId === String(item?.id ?? "") ? "bg-blue-500/10 border border-blue-500" : ""}`}
    >
      <Text className="text-white font-interMedium">{String(item?.nome ?? item?.title ?? "Atividade")}</Text>
      <Text className="text-gray-400 text-xs mt-1">{item.local}</Text>
    </Pressable>
  );

  const PageContainer = Platform.OS === "web" ? ScrollView : View;

  return (
    <SafeAreaView className="bg-blue-900 flex-1 items-center">
      <View className="flex-1 w-full">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={Platform.OS === "android"} />

        <PageContainer className="w-full flex-1 px-6 max-w-[1000px] mx-auto">
          {Platform.OS === "web" && <ParticipantViewToggle />}
          <BackButton />

          <View className="mb-8">
            <Text className="text-white text-2xl font-poppinsSemiBold mb-2">Enviar Notificação</Text>
            <Text className="text-blue-200 font-inter">Crie e envie notificações push para usuários</Text>
          </View>

          <View className="flex-col w-full gap-4 text-center justify-start">
            {/* Título */}
            <View className="w-full">
              <Text className="text-gray-400 text-sm font-inter mb-2">Título da Notificação</Text>
              <Input>
                <Input.Field placeholder="Lembrete do evento, nova atividade!" onChangeText={setTitle} value={title} />
              </Input>
            </View>

            {/* Corpo da mensagem da notificação */}
            <View className="w-full">
              <Text className="text-gray-400 text-sm font-inter mb-2">Mensagem</Text>
              <Input>
                <Input.Field placeholder="Corpo da mensagem da notificação" onChangeText={setMessage} value={message} />
              </Input>
            </View>

            {/* Toggle para som*/}
            {/* <View className="w-full flex-row items-center justify-between">
              <Text className="text-blue-200 text-sm font-inter">Reproduzir Som</Text>
              <Switch
                trackColor={{ false: colors.border, true: colors.blue[500] }}
                thumbColor={soundEnabled ? colors.white : colors.neutral[300]}
                ios_backgroundColor={colors.border}
                onValueChange={setSoundEnabled}
                value={soundEnabled}
              />
            </View> */}

            {/* Enviar todos */}
            <View className="w-full flex-row items-center justify-between">
              <Text className="text-blue-200 text-sm font-inter">Enviar para todos os usuários</Text>
              <Switch
                trackColor={{ false: colors.iconbg, true: colors.iconbg }}
                thumbColor={sendToAll ? colors.white : colors.neutral[300]}
                ios_backgroundColor={colors.border}
                onValueChange={setSendToAll}
                value={sendToAll}
              />
            </View>

            {/* Selecionar usuarios */}
            {!sendToAll && (
              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">IDs dos Destinatários (separados por vírgula)</Text>
                <Input>
                  <Input.Field placeholder="ID1, ID2, ID3" onChangeText={setRecipientIdsInput} value={recipientIdsInput} autoCapitalize="none" />
                </Input>
              </View>
            )}

            <View className={`w-full ${showActivitiesList ? "" : "mb-8"}`}>
              <Text className="text-gray-400 text-sm font-inter mb-2">Referenciar Atividade (opcional)</Text>
              <Pressable
                onPress={() => setShowActivitiesList((p) => !p)}
                className="w-full h-[56px] px-4 bg-background rounded-lg border border-border flex-row items-center justify-between"
              >
                <Text className="text-white font-inter text-sm">{selectedActivityName ?? "Nenhuma atividade selecionada"}</Text>
                <Text className="text-gray-400 text-sm">Selecionar</Text>
              </Pressable>
            </View>
          </View>

          {showActivitiesList && (
            <FlatList
              data={activities}
              keyExtractor={(item) => String(item?.id ?? Math.random())}
              showsVerticalScrollIndicator={false}
              renderItem={renderActivityItem}
              contentContainerStyle={{ paddingBottom: 6 }}
              ListEmptyComponent={
                activitiesLoading ? (
                  <View className="py-6 items-center">
                    <ActivityIndicator size="small" color={colors.blue[500]} />
                  </View>
                ) : (
                  <View className="py-4 items-center">
                    <Text className="text-gray-400 text-sm">Nenhuma atividade encontrada</Text>
                  </View>
                )
              }
              ItemSeparatorComponent={() => <View className="h-2" />}
              style={{ maxHeight: 110 }}
            />
          )}

          <Button title="Enviar Notificação" className="mt-auto mb-8" loading={isLoading} onPress={handleSendNotification} />
        </PageContainer>
      </View>

      <ErrorOverlay visible={errorModalVisible} title="Erro" message={errorMessage} onConfirm={() => { setErrorModalVisible(false) }} confirmText="OK" />
      <WarningOverlay visible={warningModalVisible} title="Aviso" message={warningMessage} onConfirm={() => { setWarningModalVisible(false) }} confirmText="OK" />
    </SafeAreaView>
  );
}
