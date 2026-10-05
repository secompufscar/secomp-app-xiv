import { useState, useCallback, useRef } from "react";
import { View, Text, FlatList, ActivityIndicator, StatusBar, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { getParticipantsByActivity, unsubscribeToActivity } from "../../services/userAtActivities";
import { getActivityId } from "../../services/activities";
import { getCategories } from "../../services/categories";
import { isCredentialingCategory } from "../../services/credentialing";
import { useAuth } from "../../hooks/AuthContext";
import CredentialingRemovalDialog, { matchesParticipantName } from "../../components/overlay/credentialingRemovalDialog";
import { getUserDetails } from "../../services/users";
import { colors } from "../../styles/colors";
import BackButton from "../../components/button/backButton";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

type ParticipantsListRouteParams = {
  ParticipantsList: {
    activityId: string;
    activityName: string;
  };
};

type ParticipantDetails = {
  id: string;
  userId: string;
  userName: string;
  activityId: string;
  presente: boolean;
  inscricaoPrevia: boolean;
  listaEspera: boolean;
};

export default function ParticipantsList() {
  const { activityId, activityName } = useRoute<RouteProp<ParticipantsListRouteParams, "ParticipantsList">>().params;

  const [list, setList] = useState<ParticipantDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canUseAdminTools } = useAuth();
  const [isCredentialing, setIsCredentialing] = useState(false);
  const canRemove = Platform.OS === "web" && canUseAdminTools && isCredentialing;
  const [selected, setSelected] = useState<ParticipantDetails | null>(null);
  const [typedName, setTypedName] = useState("");
  const [removing, setRemoving] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inFlight = useRef(false);
  const focused = useRef(false);
  const focusGeneration = useRef(0);
  const loadGeneration = useRef(0);
  const total = list.length;
  const presentes = list.filter((p) => p.presente).length;

  const fetchData = useCallback(
    async (failureMessage = "Não foi possível carregar os participantes.") => {
      const generation = ++loadGeneration.current;
      setLoading(true);
      setError(null);

      try {
        const [participants, activity, categories] = await Promise.all([
          getParticipantsByActivity(activityId),
          getActivityId(activityId),
          getCategories(),
        ]);
        const detailedList = await Promise.all(
          participants.map(async (p) => {
            const user = p.user?.nome ? p.user : await getUserDetails(p.userId);
            return {
              ...p,
              userName: user.nome,
            };
          }),
        );
        // Ordena a lista de participantes pela ordem de inscrição
        const sorted = detailedList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        if (focused.current && generation === loadGeneration.current) {
          setList(sorted);
          setIsCredentialing(isCredentialingCategory(categories.find((category) => category.id === activity.categoriaId) ?? activity.categoria));
        }
      } catch (err) {
        console.error(err);
        if (focused.current && generation === loadGeneration.current) setError(failureMessage);
      } finally {
        if (focused.current && generation === loadGeneration.current) setLoading(false);
      }
    },
    [activityId],
  );

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      focusGeneration.current++;
      void fetchData();

      return () => {
        focused.current = false;
        focusGeneration.current++;
        loadGeneration.current++;
        inFlight.current = false;
        setRemoving(false);
        setSelected(null);
        setTypedName("");
        setRemovalError(null);
        setSuccess(null);
      };
    }, [fetchData]),
  );

  const removeParticipant = async () => {
    if (!canRemove || !selected || !matchesParticipantName(typedName, selected.userName) || inFlight.current || !focused.current) return;
    const generation = focusGeneration.current;
    inFlight.current = true;
    setRemoving(true);
    setRemovalError(null);
    try {
      await unsubscribeToActivity(selected.userId, activityId);
      if (!focused.current || generation !== focusGeneration.current) return;
      setSelected(null);
      setTypedName("");
      setList((previous) => previous.filter((item) => item.id !== selected.id));
      setSuccess("Participante excluído do credenciamento.");
      await fetchData("Exclusão concluída, mas não foi possível atualizar a lista. Tente novamente.");
    } catch (err: any) {
      if (focused.current && generation === focusGeneration.current)
        setRemovalError(err.response?.data?.message || "Não foi possível excluir do credenciamento. Tente novamente.");
    } finally {
      if (focused.current && generation === focusGeneration.current) {
        inFlight.current = false;
        setRemoving(false);
      }
    }
  };

  // Item da lista
  const renderParticipant = ({ item }: { item: ParticipantDetails }) => (
    <View className="py-3">
      <View className="flex-row justify-between items-center">
        <Text className="flex-1 mr-2 text-white font-inter flex-wrap">{item.userName}</Text>

        <View className="w-[90px] flex items-start justify-start">
          <View className={`w-full p-3 rounded-full flex items-center justify-center ${item.presente ? "bg-success/10" : "bg-gray-500/10"}`}>
            {item.listaEspera ? (
              <Text className={`font-interMedium text-center leading-none ${item.presente ? "text-success" : "text-gray-500"}`}>espera</Text>
            ) : (
              <Text className={`font-interMedium text-center leading-none ${item.presente ? "text-success" : "text-gray-500"}`}>
                {item.presente ? "presente" : "ausente"}
              </Text>
            )}
          </View>
        </View>
      </View>
      {canRemove && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Excluir ${item.userName} do credenciamento`}
          disabled={removing}
          onPress={() => {
            if (!removing) {
              setSelected(item);
              setTypedName("");
              setRemovalError(null);
              setSuccess(null);
            }
          }}
          style={{
            minHeight: 48,
            alignSelf: "flex-end",
            justifyContent: "center",
            paddingHorizontal: 12,
            marginTop: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.danger,
          }}
        >
          <Text style={{ color: colors.danger, fontFamily: "Inter_500Medium", fontSize: 14 }}>Excluir do credenciamento</Text>
        </Pressable>
      )}
    </View>
  );

  // Separador da lista
  const renderSeparator = () => <View className="h-[1px] bg-iconbg opacity-50 my-1" />;

  // Lista vazia
  const renderEmptyComponent = () => (
    <View className="flex-1 items-center justify-center px-4 mt-8">
      <Text className="text-gray-400 text-center font-inter text-sm">Nenhum participante encontrado</Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-blue-900">
        <ActivityIndicator size="large" color={colors.blue[500]} />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center">
        <View className="w-full px-6 max-w-[1000px] mx-auto min-h-screen">
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={Platform.OS === "android"} />

          <BackButton />
          <Text className="text-red-500 text-center">{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void fetchData()}
            style={{ minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 16 }}
          >
            <Text style={{ color: colors.white }}>Tentar carregar lista novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900 items-center">
      <View className="w-full flex-1 px-6 max-w-[1000px] mx-auto">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={Platform.OS === "android"} />

        <BackButton />

        <View className="w-full mb-8">
          <Text className="text-white text-2xl font-poppinsSemiBold mb-1">Participantes</Text>

          <Text className="text-blue-200 font-inter text-base">{activityName}</Text>
        </View>

        <View className="w-full mb-10 flex-col gap-3">
          <Text className="text-gray-400 text-sm font-interMedium w-full">Número de participantes</Text>

          <View className="flex-row gap-5">
            <View className="flex-1 p-4 flex-row items-center gap-4 bg-iconbg/20 rounded border border-border">
              <FontAwesome6 name="person" size={24} color={colors.border} />
              <Text className="text-border font-interSemiBold leading-none">{total}</Text>
            </View>

            <View className="flex-1 p-4 flex-row items-center gap-4 bg-success/10 rounded border border-success/80">
              <FontAwesome6 name="person-circle-check" size={24} color={colors.success} />
              <Text className="text-success font-interSemiBold leading-none">{presentes}</Text>
            </View>
          </View>
        </View>

        <View className="flex flex-row mb-2 items-center justify-between">
          <Text className="flex-1 mr-2 text-gray-400 text-sm font-interMedium">Nome</Text>

          <View className="w-[90px] flex items-start justify-start">
            <Text className="text-gray-400 text-sm font-interMedium">Status</Text>
          </View>
        </View>

        <View className="h-[1px] bg-[#3B465E] opacity-50 my-1" />
        {success && (
          <Text accessibilityLiveRegion="polite" style={{ color: colors.success, fontFamily: "Inter_400Regular", marginVertical: 12 }}>
            {success}
          </Text>
        )}

        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          initialNumToRender={15}
          renderItem={renderParticipant}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      </View>
      {canRemove && selected && (
        <CredentialingRemovalDialog
          name={selected.userName}
          typedName={typedName}
          onChangeName={setTypedName}
          busy={removing}
          error={removalError}
          onCancel={() => {
            if (!removing) {
              setSelected(null);
              setTypedName("");
              setRemovalError(null);
            }
          }}
          onConfirm={removeParticipant}
        />
      )}
    </SafeAreaView>
  );
}
