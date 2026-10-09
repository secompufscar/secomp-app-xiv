import ParticipantViewToggle from "./participantViewToggle";
import { ScrollView, View, StatusBar, Platform } from "react-native";
import { ReactNode, useEffect} from "react";
import { useNavigation, NavigationProp, ParamListBase } from "@react-navigation/native";
import { setupNotificationListeners } from "../../services/notifications";

interface AppLayoutProps {
  children: ReactNode;
}

// Wrapper do ScrollView para as páginas
export default function AppLayout({ children }: AppLayoutProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>()

  useEffect(() => {
    setupNotificationListeners(navigation);
  }, [navigation]);

  return (
    <View className="flex-1 w-full">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === "android"}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 w-full"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {Platform.OS === "web" && <ParticipantViewToggle />}
        <View className="w-full px-6 max-w-[1000px] mx-auto min-h-screen">{children}</View>
      </ScrollView>
    </View>
  );
}
