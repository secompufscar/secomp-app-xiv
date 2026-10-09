import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, Image, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../styles/colors";
import { getSponsors, deleteSponsor } from "../../services/sponsors";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ParamListBase, useFocusEffect, useNavigation } from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons";
import ConfirmationOverlay from "../../components/overlay/confirmationOverlay";
import ErrorOverlay from "../../components/overlay/errorOverlay";
import Button from "../../components/button/button";
import BackButton from "../../components/button/backButton";

export default function SponsorsAdmin() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  // Estado para armazenar a lista de patrocinadores
  const [list, setList] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

  // Carrega os patrocinadores
  const fetchSponsors = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getSponsors();
      setList(data);
    } catch {
      setError("Não foi possível carregar os patrocinadores. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Recarrega a lista toda vez que a tela for focada
  useFocusEffect(
    useCallback(() => {
      fetchSponsors();
    }, []),
  );

  // Abre modal de confirmação e armazena ID a ser deletado
  const confirmDelete = (id: string) => {
    setToDeleteId(id);
    setModalVisible(true);
  };

  // Deleta o patrocinador selecionado
  const handleDelete = async () => {
    if (!toDeleteId) return;

    setModalVisible(false);
    setErrorModalVisible(false);

    try {
      await deleteSponsor(toDeleteId);
      setList(prevList => prevList.filter(item => item.id !== toDeleteId));
    } catch {
      setErrorModalVisible(true);
    } finally {
      setModalVisible(false);
      setToDeleteId(null);
    }
  };

  // Itens da lista
  const renderEventItem = ({ item }: { item: Sponsor }) => (
    <Pressable
      onPress={() => {navigation.navigate("SponsorsAdminUpdate", { id: item.id })}}
    >
      {({ pressed }) => (
        <View className={`flex flex-row items-center justify-between p-4 rounded-lg shadow mb-4 border border-iconbg gap-4 ${pressed ? "bg-background/80" : "bg-background"}`}>
          <View className="flex-1 flex-row items-center gap-5">
            <View className="w-[34px] h-[34px] rounded">
              <Image
                source={{ uri: item.logoUrl }}
                className="w-full h-full rounded"
                resizeMode="contain"
              />
            </View>

            <Text className="text-white font-poppins">{item.name}</Text>
          </View>

          {/* Botão de deletar evento */}
          <Pressable onPress={(e) => {
            e.stopPropagation();
            confirmDelete(String(item.id));
          }}>
            {({ pressed }) => (
              <View className={`flex w-[34px] h-[34px] items-center justify-center bg-danger/10 rounded border border-danger ${pressed ? "bg-danger/20" : "bg-danger/10"}`}>
                <FontAwesome name="trash" size={16} color={colors.danger} />
              </View>
            )}
          </Pressable>
        </View>
      )}
    </Pressable>
  );

  // Lista vazia
  const emptyList = () => {
    if (loading) {
      return (
        <ActivityIndicator size="large" color={colors.blue[500]} className="my-4" />
      );
    }

    return (
      <View className="flex-1 items-center justify-center mt-2">
        <Text className="text-gray-400 font-inter">
          Nenhum patrocinador encontrado
        </Text>
      </View>
    );
  };

  const listStatusHeader = <>{error && <Text className="text-red-400 text-center mt-2">{error}</Text>}</>;
  const pageHeader = (
    <>
      {Platform.OS === "web" && <ParticipantViewToggle />}
      <BackButton />

      {/* Cabeçalho */}
      <View className="mb-8">
        <Text className="text-white text-2xl font-poppinsSemiBold mb-2">Painel de patrocinadores</Text>
        <Text className="text-gray-400 font-inter">Painel de administração dos patrocinadores</Text>
      </View>

      <Button title="Criar patrocinador" onPress={() => navigation.navigate("SponsorsAdminCreate")} />

      {/* Lista de patrocinadores */}
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

        <View className="w-full flex-1 px-6 max-w-[1000px] mx-auto">
          {Platform.OS !== "web" && pageHeader}
          <View className="flex-1 mt-8">
            {Platform.OS !== "web" && listStatusHeader}

            <FlatList
              ListHeaderComponent={Platform.OS === "web" ? <>{pageHeader}{listStatusHeader}</> : undefined}
              data={list}
              renderItem={renderEventItem}
              ListEmptyComponent={emptyList}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 36 }}
            />
          </View>
        </View>
      </View>

      <ConfirmationOverlay
        visible={modalVisible}
        title="Confirmar exclusão"
        message="Tem certeza que deseja remover este patrocinador?"
        onCancel={() => {setModalVisible(false)}}
        onConfirm={handleDelete}
        confirmText="Excluir"
      />

      <ErrorOverlay
        visible={errorModalVisible}
        title="Erro ao excluir"
        message="Não foi possível excluir este patrocinador"
        onConfirm={() => {setErrorModalVisible(false)}}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}
