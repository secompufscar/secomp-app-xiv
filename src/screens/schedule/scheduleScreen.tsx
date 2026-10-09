import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { useState } from "react";
import { View, Text, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ParamListBase, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../hooks/AuthContext";
import DaysFilter from "../../components/schedule/DaysFilter";
import ActivityList from "../../components/schedule/activityList";

export default function Activities() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { user: { user } }: any = useAuth();

  const [selectedDay, setSelectedDay] = useState<string>("SEG");

  // Callback ao selecionar um dia no DaysFilter
  const handleSelectDay = (day: string) => {
    setSelectedDay(day);
  };

  // Callback ao pressionar uma atividade
  const handlePressActivity = (item: Activity) => {
    navigation.navigate("ActivityDetails", { item });
  };

  const pageHeader = (
    <>
      {Platform.OS === "web" && <ParticipantViewToggle />}
      {/* Cabeçalho */}
      <View className="mb-8">
        <Text className="text-white text-2xl font-poppinsSemiBold mb-2">Cronograma</Text>
        <Text className="text-gray-400 font-inter text-">Calendário de atividades do evento</Text>
      </View>

      {/* Filtro de Dias */}
      <View className="w-full mb-3">
        <DaysFilter onSelect={handleSelectDay} />
      </View>

      {/* Lista de Atividades */}
    </>
  );
  return (
    <SafeAreaView className="bg-blue-900 flex-1 items-center">
      <View className="flex-1 w-full">
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={Platform.OS === "android"}
        />

        <View className="w-full flex-1 mt-10 px-6 max-w-[1000px] mx-auto">
          {Platform.OS !== "web" && pageHeader}
          <View className="w-full flex-1">
            <ActivityList
              header={Platform.OS === "web" ? pageHeader : undefined} selectedDay={selectedDay} onPressActivity={handlePressActivity} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
