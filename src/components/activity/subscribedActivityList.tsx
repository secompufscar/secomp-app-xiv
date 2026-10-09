import { ReactElement, useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { parseISO, addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../../hooks/AuthContext";
import { getActivities } from "../../services/activities";
import { getUserSubscribedActivities } from "../../services/userAtActivities";
import { colors } from "../../styles/colors";

export type Activity = {
  id: string;
  nome: string;
  palestranteNome: string;
  data: string;
  vagas: string;
  detalhes: string;
  categoriaId: string;
  local: string;
};

type SubscribedActivityListProps = {
  header?: ReactElement | null;
  onPressActivity?: (item: Activity) => void;
};

export function SubscribedActivityList({ header, onPressActivity }: SubscribedActivityListProps) {
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    (async () => {
      try {
        // 1) Busca inscrições do usuário e extrai os IDs
        const userSubs = await getUserSubscribedActivities(String(user.id));
        const subscribedIds = userSubs.map((u) => u.activityId);

        // 2) Busca todas as atividades e filtra
        const allActs = await getActivities();
        const filtered = allActs.filter((a) => subscribedIds.includes(a.id));

        const sorted = filtered.sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" })
        );

        setActivities(sorted);
      } catch (err: any) {
        setErrorMsg("Não foi possível carregar suas inscrições.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  if (loading) {
    const placeholder = (
      <View className="flex-1 items-center justify-center pb-24">
        <ActivityIndicator size="large" color={colors.blue[500]} />
      </View>
    );
    return header ? <FlatList data={[]} renderItem={() => null} ListHeaderComponent={header} ListEmptyComponent={placeholder} /> : placeholder;
  }

  if (errorMsg) {
    const placeholder = (
      <View className="flex-1 items-center justify-center px-4 pb-24">
        <Text className="text-red-500 text-center font-inter text-sm">{errorMsg}</Text>
      </View>
    );
    return header ? <FlatList data={[]} renderItem={() => null} ListHeaderComponent={header} ListEmptyComponent={placeholder} /> : placeholder;
  }

  if (activities.length === 0) {
    const placeholder = (
      <View className="flex-1 items-center justify-start mt-8">
        <Text className="text-gray-400 text-center text-sm font-inter">Você não está inscrito em nenhuma atividade</Text>
      </View>
    );
    return header ? <FlatList data={[]} renderItem={() => null} ListHeaderComponent={header} ListEmptyComponent={placeholder} /> : placeholder;
  }

  return (
    <FlatList
      ListHeaderComponent={header}
      data={activities}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 16, paddingTop: 4 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const rawDate = parseISO(item.data);
        const dateObj = addHours(rawDate, 0);
        const dia = format(dateObj, "dd", { locale: ptBR });
        const mes = format(dateObj, "MMMM", { locale: ptBR });

        return (
          <Pressable
            onPress={() => onPressActivity?.(item)}
            className="flex-row items-center bg-background rounded-lg p-4 mx-0 mb-4 shadow-sm active:bg-background/70"
          >
            <View className="min-w-[55px] flex items-center justify-center mr-4">
              <Text className="text-white text-3xl font-poppinsSemiBold">{dia}</Text>
              <Text className="text-blue-300 text-xs font-inter lowercase">{mes}</Text>
            </View>

            <View className="w-px h-12 bg-[#3B465E] opacity-50 mr-4" />

            <View className="flex-1 flex-col flex-wrap justify-between py-1">
              <Text numberOfLines={1} className="text-white text-[14px] font-poppinsMedium mb-1">
                {item.nome}
              </Text>

              <Text className="text-default text-[13px] font-inter">
                Horário:{" "}
                <Text className="text-green font-inter">{item.data.substring(11, 16)}</Text>
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
