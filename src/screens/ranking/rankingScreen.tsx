import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { memo, useCallback, useState } from "react";
import { Text, View, StatusBar, Platform, ActivityIndicator, FlatList, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../styles/colors";
import { getTop50Users } from "../../services/users";
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import BackButton from "../../components/button/backButton";
import ErrorOverlay from "../../components/overlay/errorOverlay";

const RANK_COLORS: Record<number, string> = {
  1: "border-[#FFD700]/80 bg-[#FFD700]/10", // ouro
  2: "border-[#C0C0C0]/80 bg-[#C0C0C0]/10", // prata
  3: "border-[#CD7F32]/80 bg-[#CD7F32]/10", // bronze
};

type RankingItemProps = {
  index: number;
  nome: string;
  points: number;
};

const RankingItem = memo(({ index, nome, points }: RankingItemProps) => {
  const rankColor = RANK_COLORS[index] || "border-border bg-[#293247]";

  return (
    <View className="flex-row items-center justify-between p-[12px] mb-[8px] bg-background rounded-lg border border-iconbg">
      <View className={`flex items-center justify-center w-[36px] p-2 aspect-square rounded-md border ${rankColor}`}>
        <Text className="text-[#F8F8F8] font-poppinsSemiBold text-center">{index}</Text>
      </View>

      <Text className="text-gray-200 font-interMedium flex-1 mx-4">{nome}</Text>

      <View className="relative flex items-center p-2 min-w-[44px] border border-gray-500 rounded-md">
        {index <= 3 &&
          <Image source={require("../../../assets/icons/points.png")} className="absolute -left-[12] -top-3" style={{ width: 24, height: 24 }} />
        }
        <Text className="text-gray-300 font-interMedium text-center">{points}</Text>
      </View>
    </View>
  );
});

export default function Ranking() {
  const [ranking, setRanking] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchRanking = async () => {
        try {
          setLoading(true);
          const data = await getTop50Users();
          setRanking(data);
        } catch (error: any) {
          setErrorModalVisible(true);
        } finally {
          setLoading(false);
        }
      };

      fetchRanking();
    }, [])
  );

  // Nenhum usuário no ranking
  const emptyList = () => {
    if (loading) {
      return (
        <ActivityIndicator size="large" color={colors.blue[500]} className="my-4" />
      );
    }

    return (
      <View className="flex-1 items-center justify-center mt-2">
        <Text className="text-gray-400 font-inter">
          Nenhum usuário encontrado
        </Text>
      </View>
    );
  };

  // Item do ranking
  const renderItem = useCallback(
    ({ item }: { item: User; index: number }) => (
      <RankingItem index={Number(item.rank)} nome={item.nome} points={item.points} />
    ),
    []
  );

  const pageHeader = (
    <>
      {Platform.OS === "web" && <ParticipantViewToggle />}
      <BackButton />

      <LinearGradient
        colors={["#3b82f6bc", "#4CEDB9bc"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-[7px] p-[1.5px] w-full mb-6 overflow-hidden"
      >
        <View className="flex flex-row items-center p-6 gap-6 bg-background/[95%] rounded-[6px]">
          <FontAwesome5 name="trophy" size={42} color="#3b82f6ee" />

          <View className="flex-1">
            <Text className="text-[#F8F8F8] text-2xl font-poppinsSemiBold mb-[6px]">Ranking</Text>

            <Text className="text-[#F8F8F8]/90 font-inter">Os 50 melhores desta edição!</Text>
          </View>
        </View>
      </LinearGradient>
    </>
  );
  return (
    <SafeAreaView className="bg-blue-900 flex-1 items-center">
      <View className="flex-1 w-full">
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={Platform.OS === "android"} />

          <View className="w-full flex-1 px-6 max-w-[1000px] mx-auto">
            {Platform.OS !== "web" && pageHeader}

            <FlatList
              ListHeaderComponent={Platform.OS === "web" ? pageHeader : undefined}
              data={ranking}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={emptyList}
              renderItem={renderItem}
              initialNumToRender={20}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              ListFooterComponent={<View className="h-8" />}
            />
          </View>
      </View>
      <ErrorOverlay
        visible={errorModalVisible}
        title="Erro!"
        message="Não foi possível carregar o ranking de usuários"
        onConfirm={() => {setErrorModalVisible(false)}}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}
