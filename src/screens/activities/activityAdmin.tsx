import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { View, Text, Pressable, StatusBar, Platform, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ParamListBase, useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { getActivities, deleteActivity } from "../../services/activities";
import { getImagesByActivityId, deleteActivityImageById } from "../../services/activityImage";
import { colors } from "../../styles/colors";
import ConfirmationOverlay from "../../components/overlay/confirmationOverlay";
import ErrorOverlay from "../../components/overlay/errorOverlay";
import BackButton from "../../components/button/backButton";
import Button from "../../components/button/button";
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ActivityAdmin() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);
  const [imagesToDelete, setImagesToDelete] = useState<ActivityImage[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchActivities = async () => {
        setLoading(true);
        setError(null);

        try {
          const data = await getActivities();

          const sorted = data.sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" })
          );

          setActivities(sorted);
        } catch (err) {
          setError("Não foi possível carregar as atividades. Tente novamente.");
        } finally {
          setLoading(false);
        }
      };

      fetchActivities();
    }, [])
  );

  // Abre modal de confirmação e armazena ID a ser deletado
  const confirmDelete = async (id: string) => {
    setToDeleteId(id);

    try {
      const images = await getImagesByActivityId(id);
      setImagesToDelete(images);
    } catch {
      setImagesToDelete([]);
    }

    setModalVisible(true);
  };

  const handleDelete = async () => {
    if (!toDeleteId) return;

    setModalVisible(false);
    setErrorModalVisible(false);

    try {
      if (imagesToDelete.length > 0) {
        await Promise.all(imagesToDelete.map(img => deleteActivityImageById(img.id)));
      }

      await deleteActivity(toDeleteId);
      setActivities(prevList => prevList.filter(item => item.id !== toDeleteId));
    } catch {
      setErrorModalVisible(true);
    } finally {
      setModalVisible(false);
      setToDeleteId(null);
      setImagesToDelete([]);
    }
  };

  const renderActivityItem = ({ item }: { item: Activity }) => (
    <Pressable
      onPress={() => {
        navigation.navigate("ActivityAdminUpdate", { id: item.id });
      }}
    >
      {({ pressed }) => (
        <View className={`flex flex-row items-center justify-between p-4 rounded-lg shadow mb-4 border border-iconbg gap-3 ${pressed ? "bg-background/80" : "bg-background"}`}>
          <View className="flex-1 flex-col gap-1">
            <Text className="text-white font-poppinsMedium line-clamp-1">{item.nome}</Text>
            <Text className="text-sm text-gray-600 font-interMedium line-clamp-1">{item.palestranteNome}</Text>
          </View>

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

  const emptyList = () => {
    if (loading) {
      return (
        <ActivityIndicator size="large" color={colors.blue[500]} className="my-4" />
      );
    }

    return (
      <View className="flex-1 items-center justify-center mt-2">
        <Text className="text-gray-400 font-inter">
          Nenhuma atividade encontrada
        </Text>
      </View>
    );
  };

  const listStatusHeader = <>{error && <Text className="text-red-400 text-center mt-8">{error}</Text>}</>;
  const pageHeader = (
    <>
      {Platform.OS === "web" && <ParticipantViewToggle />}
      <BackButton />

      {/* Cabeçalho */}
      <View className="mb-8">
        <Text className="text-white text-2xl font-poppinsSemiBold mb-2">Painel de Atividades</Text>
        <Text className="text-gray-400 font-inter">Painel de administração das atividades</Text>
      </View>

      <Button
        title="Criar atividade"
        onPress={() => {
          navigation.navigate("ActivityAdminCreate");
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
              data={activities}
              renderItem={renderActivityItem}
              ListEmptyComponent={emptyList}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              initialNumToRender={15}
              contentContainerStyle={{ paddingBottom: 36 }}
            />
          </View>
        </View>
      </View>

      <ConfirmationOverlay
        visible={modalVisible}
        title="Confirmar exclusão"
        message="Tem certeza que deseja deletar esta atividade?"
        onCancel={() => {setModalVisible(false)}}
        onConfirm={handleDelete}
        confirmText="Excluir"
      />

      <ErrorOverlay
        visible={errorModalVisible}
        title="Erro ao excluir"
        message="Não foi possível excluir esta atividade"
        onConfirm={() => {setErrorModalVisible(false)}}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}
