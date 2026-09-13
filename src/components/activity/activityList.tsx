import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { getActivities } from "../../services/activities";
import { getCategories } from "../../services/categories";
import { parseISO, addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { colors } from "../../styles/colors";
import { useFocusEffect } from "@react-navigation/native";

type ActivityListProps = {
  selectedCategory?: string; 
  onPressActivity?: (item: Activity) => void; 
};

export default function ActivityList({ selectedCategory, onPressActivity }: ActivityListProps) {
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Função auxiliar para normalizar strings (acentos e caixa baixa)
  const normalize = (str: string) => str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // Busca as categorias e atividades na montagem do componente
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchData = async () => {
        setLoading(true); 
        try {
          const [cats, acts] = await Promise.all([getCategories(), getActivities()]);

          if (isActive) {
            setAllCategories(cats);
            setAllActivities(acts);
            setErrorMsg(null); 
          }
        } catch (err: any) {
          console.error("Erro ao buscar dados:", err);
          if (isActive) {
            setErrorMsg("Falha ao obter dados.");
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      fetchData();

      return () => {
        isActive = false;
      };
    }, []), 
  );

  // Tela de loading
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center pb-24">
        <ActivityIndicator size="large" color={colors.blue[500]} />
      </View>
    );
  }

  // Tela de erro
  if (errorMsg) {
    return (
      <View className="flex-1 items-center justify-center px-4 pb-24">
        <Text className="text-danger text-center font-inter text-sm">{errorMsg}</Text>
      </View>
    );
  }

  // Exibe aviso enquanto categorias ainda carregam
  if (selectedCategory && allCategories.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-4 pb-24">
        <Text className="text-gray-400 text-center font-inter text-sm">
          Carregando categorias...
        </Text>
      </View>
    );
  }

  // Retorna apenas as atividades pertencentes à categoria selecionada
  const getFilteredActivities = (): Activity[] => {
    if (!selectedCategory) {
      return allActivities;
    }

    let targetName: string[];
    const selNorm = normalize(selectedCategory);

    if (selNorm === normalize("Outros")) {
      targetName = ["Workshop", "Gamenight", "Sociocultural", "Credenciamento", "Coffee", "Outros"];
    } else {
      targetName = [selNorm];
    }

    const catObj = allCategories.find((c) => targetName.includes(normalize(c.nome)));
    if (!catObj) {
      return [];
    }

    return allActivities.filter((a) => a.categoriaId === catObj.id);
  };

  const filtered = getFilteredActivities().sort((a, b) => {
    const dateA = new Date(a.data).getTime();
    const dateB = new Date(b.data).getTime();
    return dateA - dateB;
  });

  // Nenhuma atividade encontrada para a categoria
  if (filtered.length === 0) {
    return (
      <View className="flex-1 items-center justify-start mt-8">
        <Text className="text-gray-400 text-center text-sm font-inter">
          Nenhuma atividade em {selectedCategory}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 60, paddingTop: 4 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const rawDate = parseISO(item.data);
        const dataObj = addHours(rawDate, 3); 
        const dia = format(dataObj, "dd", { locale: ptBR });
        const mes = format(dataObj, "MMMM", { locale: ptBR });

        return (
          <Pressable
            onPress={() => onPressActivity?.(item)}
            className="flex-row items-center bg-background rounded-lg p-4 mb-4 shadow-sm active:bg-background/70"
          >
            <View className="min-w-[50px] flex items-center justify-center mr-4">
              <Text className="text-white text-3xl font-poppinsSemiBold">{dia}</Text>
              <Text className="text-blue-300 text-xs font-inter lowercase">{mes}</Text>
            </View>

            <View className="w-px h-12 bg-[#3B465E] opacity-50 mr-4" />

            <View className="flex-1 flex-col justify-between py-1">
              <Text numberOfLines={1} ellipsizeMode="tail" className="text-white text-[14px] font-poppinsMedium mb-1">
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
