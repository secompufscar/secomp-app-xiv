import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { getActivities } from "../../services/activities";
import { getParticipantsByActivity } from "../../services/userAtActivities";
import { colors } from "../../styles/colors";
import BackButton from "../../components/button/backButton";
import { Input } from "../../components/input/input";

type ListMode = "inscritos" | "presentes";

type Row = {
  id: string;
  numero: number;
  nome: string;
};

// Remove acentos e caixa para a busca de atividades
const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Ordem fixa (inscrição mais antiga primeiro, desempate por id) para que a
// numeração não mude entre uma consulta e outra.
const byEnrollmentOrder = (a: UserAtActivity, b: UserAtActivity) => {
  const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  return diff !== 0 ? diff : a.id.localeCompare(b.id);
};

function buildRows(enrollments: UserAtActivity[], mode: ListMode): Row[] {
  const filtered = enrollments.filter((e) =>
    // Inscritos: quem se inscreveu antes (inclui lista de espera).
    // Quem só apareceu e fez check-in na hora tem inscricaoPrevia = false.
    mode === "presentes" ? e.presente : e.inscricaoPrevia || e.listaEspera
  );

  return [...filtered].sort(byEnrollmentOrder).map((e, index) => ({
    id: e.id,
    numero: index + 1,
    nome: e.user?.nome ?? "Nome indisponível",
  }));
}

export default function ActivityRaffleLists() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Activity | null>(null);
  const [enrollments, setEnrollments] = useState<UserAtActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ListMode>("inscritos");

  const requestRef = useRef(0);
  const selectedId = selected?.id;

  // Carrega as atividades para o seletor
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchActivities = async () => {
        setActivitiesLoading(true);
        setActivitiesError(null);

        try {
          const data = await getActivities();
          if (!isActive) return;

          setActivities(
            [...data].sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }))
          );
        } catch {
          if (isActive) setActivitiesError("Não foi possível carregar as atividades. Tente novamente.");
        } finally {
          if (isActive) setActivitiesLoading(false);
        }
      };

      fetchActivities();

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Carrega inscritos/presentes da atividade escolhida
  const loadEnrollments = useCallback(async (activityId: string) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await getParticipantsByActivity(activityId);
      if (requestId !== requestRef.current) return;
      setEnrollments(data);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error(err);
      setEnrollments([]);
      setError("Não foi possível carregar a lista. Tente novamente.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selectedId) loadEnrollments(selectedId);
    }, [selectedId, loadEnrollments])
  );

  const inscritos = useMemo(() => buildRows(enrollments, "inscritos"), [enrollments]);
  const presentes = useMemo(() => buildRows(enrollments, "presentes"), [enrollments]);
  const rows = mode === "inscritos" ? inscritos : presentes;

  const filteredActivities = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return activities;
    return activities.filter(
      (a) => normalize(a.nome).includes(term) || normalize(a.palestranteNome ?? "").includes(term)
    );
  }, [activities, search]);

  const selectActivity = (activity: Activity) => {
    setEnrollments([]);
    setError(null);
    setMode("inscritos");
    setSelected(activity);
  };

  const clearSelection = () => {
    requestRef.current++;
    setSelected(null);
    setEnrollments([]);
    setError(null);
    setLoading(false);
  };

  const renderActivity = ({ item }: { item: Activity }) => (
    <Pressable onPress={() => selectActivity(item)}>
      {({ pressed }) => (
        <View
          className={`flex flex-row items-center justify-between p-4 rounded-lg mb-4 border border-iconbg gap-3 ${
            pressed ? "bg-background/80" : "bg-background"
          }`}
        >
          <View className="flex-1 flex-col gap-1">
            <Text className="text-white font-poppinsMedium line-clamp-1">{item.nome}</Text>
            <Text className="text-sm text-gray-600 font-interMedium line-clamp-1">{item.palestranteNome}</Text>
          </View>

          <FontAwesome name="chevron-right" size={14} color={colors.blue[200]} />
        </View>
      )}
    </Pressable>
  );

  const renderRow = ({ item }: { item: Row }) => (
    <View className="flex-row items-center py-3">
      <Text className="w-14 text-blue-200 font-interSemiBold">{item.numero}</Text>
      <Text className="flex-1 text-white font-inter flex-wrap">{item.nome}</Text>
    </View>
  );

  const renderSeparator = () => <View className="h-[1px] bg-iconbg opacity-50 my-1" />;

  const tabClass = (active: boolean) =>
    `flex-1 p-3 rounded border items-center justify-center ${
      active ? "bg-blue-500/20 border-blue-500" : "bg-iconbg/20 border-border"
    }`;

  return (
    <SafeAreaView className="bg-blue-900 flex-1 items-center">
      <View className="w-full flex-1 px-6 max-w-[1000px] mx-auto">
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={Platform.OS === "android"}
        />

        <BackButton />

        <View className="mb-6">
          <Text className="text-white text-2xl font-poppinsSemiBold mb-2">Listas para sorteio</Text>
          <Text className="text-gray-400 font-inter">
            Inscritos (com lista de espera) e presentes por atividade
          </Text>
        </View>

        {!selected ? (
          <View className="flex-1">
            <Input>
              <FontAwesome name="search" size={16} color={colors.border} />
              <Input.Field
                placeholder="Buscar atividade"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
            </Input>

            {activitiesError && <Text className="text-red-400 text-center mt-4">{activitiesError}</Text>}

            <FlatList
              className="mt-4"
              data={filteredActivities}
              renderItem={renderActivity}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              initialNumToRender={15}
              contentContainerStyle={{ paddingBottom: 36 }}
              ListEmptyComponent={
                activitiesLoading ? (
                  <ActivityIndicator size="large" color={colors.blue[500]} className="my-4" />
                ) : (
                  <View className="flex-1 items-center justify-center mt-2">
                    <Text className="text-gray-400 font-inter">Nenhuma atividade encontrada</Text>
                  </View>
                )
              }
            />
          </View>
        ) : (
          <View className="flex-1">
            <View className="flex-row items-center justify-between gap-3 p-4 mb-4 rounded-lg border border-iconbg bg-background">
              <View className="flex-1">
                <Text className="text-white font-poppinsMedium">{selected.nome}</Text>
                <Text className="text-sm text-gray-600 font-interMedium">{selected.palestranteNome}</Text>
              </View>

              <View className="flex-row items-center gap-4">
                <Pressable onPress={() => loadEnrollments(selected.id)} hitSlop={8}>
                  <FontAwesome name="refresh" size={18} color={colors.blue[200]} />
                </Pressable>

                <Pressable onPress={clearSelection} hitSlop={8}>
                  <Text className="text-blue-200 font-interMedium">Trocar</Text>
                </Pressable>
              </View>
            </View>

            <View className="flex-row gap-3 mb-6">
              <Pressable className="flex-1" onPress={() => setMode("inscritos")}>
                <View className={tabClass(mode === "inscritos")}>
                  <Text className="text-white font-interMedium">Inscritos ({inscritos.length})</Text>
                </View>
              </Pressable>

              <Pressable className="flex-1" onPress={() => setMode("presentes")}>
                <View className={tabClass(mode === "presentes")}>
                  <Text className="text-white font-interMedium">Presentes ({presentes.length})</Text>
                </View>
              </Pressable>
            </View>

            <View className="flex-row mb-2 items-center">
              <Text className="w-14 text-gray-400 text-sm font-interMedium">Nº</Text>
              <Text className="flex-1 text-gray-400 text-sm font-interMedium">Nome</Text>
            </View>

            <View className="h-[1px] bg-[#3B465E] opacity-50 my-1" />

            {error && <Text className="text-red-400 text-center mt-4">{error}</Text>}

            {loading ? (
              <ActivityIndicator size="large" color={colors.blue[500]} className="my-6" />
            ) : (
              <FlatList
                data={rows}
                renderItem={renderRow}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={renderSeparator}
                showsVerticalScrollIndicator={false}
                initialNumToRender={20}
                contentContainerStyle={{ paddingBottom: 32 }}
                ListEmptyComponent={
                  !error ? (
                    <View className="flex-1 items-center justify-center px-4 mt-8">
                      <Text className="text-gray-400 text-center font-inter text-sm">
                        {mode === "inscritos" ? "Nenhum inscrito encontrado" : "Nenhuma presença registrada"}
                      </Text>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
