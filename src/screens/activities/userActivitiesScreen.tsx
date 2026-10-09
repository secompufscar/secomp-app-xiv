import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { View, Text, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SubscribedActivityList } from "../../components/activity/subscribedActivityList";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ParamListBase, useNavigation } from "@react-navigation/native";
import BackButton from "../../components/button/backButton";

export default function MyEvents() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  interface ActivityItem {
    id: string;
    [key: string]: any;
  }

  interface ScheduleDetailsParams {
    item: ActivityItem;
  }

  const handlePressActivity = (item: ActivityItem): void => {
    navigation.navigate("ActivityDetails", { item } as ScheduleDetailsParams);
  };

  const pageHeader = (
    <>
      {Platform.OS === "web" && <ParticipantViewToggle />}
      <BackButton />

      {/* Cabeçalho */}
      <View className="mb-6">
        <Text className="text-white text-2xl font-poppinsSemiBold mb-2">Minhas Atividades</Text>
        <Text className="text-gray-400 font-inter">Todas as suas inscrições e atividades salvas</Text>
      </View>

      {/* Lista de Inscrições */}
    </>
  );
  return (
    <SafeAreaView className="bg-blue-900 flex-1 items-center">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === "android"}
      />
      <View className="flex-1 w-full px-6 max-w-[1000px] mx-auto">
        {Platform.OS !== "web" && pageHeader}
        <View className="flex-1 w-full">
          <SubscribedActivityList
              header={Platform.OS === "web" ? pageHeader : undefined} onPressActivity={handlePressActivity} />
        </View>
      </View>
    </SafeAreaView>
  );
}
