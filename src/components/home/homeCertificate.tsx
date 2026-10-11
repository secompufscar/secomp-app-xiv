import { Platform, Pressable, Text, View } from "react-native";
import { useNavigation, NavigationProp, ParamListBase } from "@react-navigation/native";
import { Award, ChevronRight } from "lucide-react-native";

export default function HomeCertificate() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  if (Platform.OS !== "web") return null;
  return <View className="w-full mb-8 gap-4">
    <Text className="text-sm text-green font-poppinsMedium">Certificados de participação</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Meus certificados" onPress={() => navigation.navigate("MyCertificates")} className="w-full min-h-[80px] py-4 px-5 flex-row items-center gap-4 border border-iconbg rounded-[8px] bg-background active:opacity-80">
      <Award color="#A9B4F4" size={28} />
      <Text className="flex-1 text-white text-sm font-poppinsMedium">Meus certificados</Text>
      <ChevronRight color="#A9B4F4" size={20} />
    </Pressable>
  </View>;
}
