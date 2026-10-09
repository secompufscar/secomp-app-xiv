import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { View, Text, Pressable, StatusBar, Platform, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ParamListBase, useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { getEvents, deleteEvent } from "../../services/events";
import { colors } from "../../styles/colors";
import ConfirmationOverlay from "../../components/overlay/confirmationOverlay";
import ErrorOverlay from "../../components/overlay/errorOverlay";
import BackButton from "../../components/button/backButton";
import Button from "../../components/button/button";
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function EventAdmin() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  const [events, setEvents] = useState<Events[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const fetchEvents = async () => {
        setLoading(true);
        setError(null);

        try {
          const data = await getEvents();
          setEvents(data);
        } catch (err) {
          setError("Não foi possível carregar os eventos. Tente novamente.");
        } finally {
          setLoading(false);
        }
      };

      fetchEvents();
    }, [])
  );

  // Abre modal de confirmação e armazena ID a ser deletado
  const confirmDelete = (id: string) => {
    setToDeleteId(id);
    setModalVisible(true);
  };

  // Deleta o evento selecionado
  const handleDelete = async () => {
    if (!toDeleteId) return;

    setModalVisible(false);
    setErrorModalVisible(false);

    try {
      await deleteEvent(toDeleteId);
      setEvents(prevList => prevList.filter(item => item.id !== toDeleteId));
    } catch {
      setErrorModalVisible(true);
    } finally {
      setModalVisible(false);
      setToDeleteId(null);
    }
  };

  // Itens da lista
  const renderEventItem = ({ item }: { item: Events }) => (
    <Pressable
      onPress={() => {navigation.navigate("EventAdminUpdate", { id: item.id })}}
    >
      {({ pressed }) => (
        <View className={`flex flex-row items-center justify-between p-4 rounded-lg shadow mb-4 border border-iconbg gap-3 ${pressed ? "bg-background/80" : "bg-background"}`}>
          <View className="flex-1">
            <Text className="text-lg text-white font-poppinsSemiBold">{item.year}</Text>

            <View className="flex flex-row mt-1 flex-wrap">
              <Text className="text-gray-600 font-inter">
                {new Date(item.startDate).toLocaleDateString('pt-BR')} -
              </Text>
              <Text className="text-gray-600 font-inter ml-1">
                {new Date(item.endDate).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </View>

          {/* Botão de deletar evento */}
          <Pressable onPress={(e) => {
            e.stopPropagation();
            if (item.id) {
              confirmDelete(item.id);
            }
          }}>
            {({ pressed }) => (
              <View className={`flex w-[44px] h-[44px] items-center justify-center bg-danger/10 rounded border border-danger ${pressed ? "bg-danger/20" : "bg-danger/10"}`}>
                <FontAwesome name="trash" size={20} color={colors.danger} />
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
          Nenhum evento encontrado
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
        <Text className="text-white text-2xl font-poppinsSemiBold mb-2">Painel de eventos</Text>
        <Text className="text-gray-400 font-inter">Painel de administração dos eventos</Text>
      </View>

      <Button
        title="Criar evento"
        onPress={() => {
          navigation.navigate("EventAdminCreate");
        }}
      />
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
              data={events}
              renderItem={renderEventItem}
              ListEmptyComponent={emptyList}
              keyExtractor={(item) => item.year.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 36 }}
            />
          </View>
        </View>
      </View>

      <ConfirmationOverlay
        visible={modalVisible}
        title="Confirmar exclusão"
        message="Tem certeza que deseja deletar este evento?"
        onCancel={() => {setModalVisible(false)}}
        onConfirm={handleDelete}
        confirmText="Excluir"
      />

      <ErrorOverlay
        visible={errorModalVisible}
        title="Erro ao excluir"
        message="Não foi possível excluir este evento"
        onConfirm={() => {setErrorModalVisible(false)}}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}
