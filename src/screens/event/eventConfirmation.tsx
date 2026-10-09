import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { View, Text, Image, StatusBar, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ParamListBase, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Button from "../../components/button/button";

export default function EventConfirmation() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const route = useRoute();
  const event = route.params as { event: Events };

  const PageContainer = Platform.OS === "web" ? ScrollView : View;

  return (
    <SafeAreaView className="bg-blue-900 flex-1 items-center">
      <PageContainer className="flex-1 w-full">
        {Platform.OS === "web" && <ParticipantViewToggle />}
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={Platform.OS === "android"}
        />

        <View className="flex flex-col w-full items-center justify-center px-6 max-w-[1000px] mx-auto min-h-screen">
          <View className="flex p-2 items-center justify-center border border-iconbg bg-iconbg/20 rounded-xl">
            <Image 
              source={require("../../../assets/icons/celebration.png")}
              resizeMode="contain" 
              style={Platform.OS === "web" ? { width: 170, height: 170 } : { width: 160, height: 160 }} 
            />
          </View>

          <View className="flex flex-col my-14 gap-5">
            <Text className="text-white text-xl text-center font-poppinsSemiBold">Sua vaga está garantida!</Text>

            <Text className="text-default text-center font-inter leading-[1.8]">Agora é só se preparar para um dia cheio de inovação, tecnologia e boas conexões.</Text>
          </View>

          <Button className="mt-4 w-[80%]" title="Continuar" onPress={() => {navigation.navigate("Home")}} />
        </View>
      </PageContainer>
    </SafeAreaView>
  );
}
