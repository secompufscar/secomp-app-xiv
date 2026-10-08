import { useCallback, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCertificate } from "@fortawesome/free-solid-svg-icons";
import { colors } from "../../styles/colors";

export default function HomeCertificate() {
  const [visible, setVisible] = useState(false);

  useFocusEffect(useCallback(() => () => setVisible(false), []));

  if (Platform.OS !== "web") return null;

  return (
    <View className="w-full mb-8 gap-4">
      <Text className="text-sm text-green font-poppinsMedium">Certificado de participação</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Gerar certificado"
        accessibilityHint="Abre as orientações. A emissão do certificado estará disponível em breve."
        onPress={() => setVisible(true)}
        className="w-full min-h-[92px] py-4 px-5 flex-row items-center gap-4 border border-iconbg rounded-[8px] bg-background active:opacity-80"
      >
        <View className="w-12 h-12 items-center justify-center rounded-lg bg-iconbg">
          <FontAwesomeIcon icon={faCertificate} size={26} color={colors.blue[200]} />
        </View>
        <View className="flex-1 min-w-0 gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-white text-sm font-poppinsMedium">Gerar certificado</Text>
            <Text className="text-blue-100 text-xs font-inter px-2 py-1 rounded bg-iconbg">Em breve</Text>
          </View>
          <Text className="text-default text-xs font-inter leading-relaxed">
            Confira as orientações para receber seu certificado.
          </Text>
        </View>
      </Pressable>

      <Modal visible={visible} transparent accessibilityLabel="Seu certificado" animationType="fade" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/70 px-4 py-6">
          <View className="w-full max-w-md max-h-full rounded-xl bg-blue-900 border border-iconbg overflow-hidden p-6">
            <View>
              <Text accessibilityRole="header" className="text-white text-xl font-poppinsSemiBold mb-3">
                Seu certificado
              </Text>
              <Text className="text-blue-100 text-sm font-inter leading-relaxed mb-4">
                A geração de certificados estará disponível em breve.
              </Text>
            </View>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 4 }}>
              <View className="rounded-lg bg-iconbg p-4 mb-5">
                <Text className="text-white text-base font-poppinsMedium mb-2">Doação registrada</Text>
                <Text className="text-default text-sm font-inter leading-relaxed">
                  Para receber seu certificado, sua doação precisa estar registrada pela equipe da SECOMP.
                </Text>
              </View>
              <Text className="text-default text-sm font-inter leading-relaxed mb-4">
                As horas certificadas correspondem às atividades com presença registrada.
              </Text>
              <Text className="text-gray-400 text-sm font-inter leading-relaxed mb-2">
                Se você já doou e tem dúvidas sobre o registro, procure a equipe da SECOMP.
              </Text>
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Entendi"
              onPress={() => setVisible(false)}
              className="w-full min-h-[48px] mt-4 py-3 px-4 items-center justify-center rounded-lg bg-blue-500 active:opacity-80"
            >
              <Text className="text-white text-sm font-poppinsMedium">Entendi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
