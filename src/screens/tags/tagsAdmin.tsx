import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { FontAwesome } from "@expo/vector-icons";
import { faTag } from "@fortawesome/free-solid-svg-icons";
import { Input } from "../../components/input/input";
import { getTags, createTag, updateTag, deleteTag } from "../../services/tags";
import { colors } from "../../styles/colors";
import ConfirmationOverlay from "../../components/overlay/confirmationOverlay";
import CreationEditionOverlay from "../../components/overlay/creationEditionOverlay";
import ErrorOverlay from "../../components/overlay/errorOverlay";
import WarningOverlay from "../../components/overlay/warningOverlay";
import BackButton from "../../components/button/backButton";
import Button from "../../components/button/button";

export default function TagsAdmin() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para modal de criar/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTagName, setNewTagName] = useState("");

  // Estados para modal de erro
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("Erro");
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  // Estados para modal de aviso
  const [warningModalVisible, setWarningModalVisible] = useState(false);

  // Estados para modal de confirmação
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [toDeleteTag, setToDeleteTag] = useState<Tag | null>(null);

  // Carrega lista de tags
  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await getTags();
      setTags(data);
    } catch {
      setError("Não foi possível carregar as tags. Tente novamente.");;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  // Abre modal de criar
  const openCreateModal = () => {
    setEditingTag(null);
    setNewTagName("");
    setModalVisible(true);
  };

  // Abre modal de editar
  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setModalVisible(true);
  };

  // Salvar (criar ou editar)
  const handleSave = async () => {
    setErrorModalVisible(false);

    if (!newTagName.trim()) {
      setWarningModalVisible(true);
      return;
    }

    try {
      if (editingTag) {
        await updateTag(String(editingTag.id), { id: editingTag.id, name: newTagName.trim() });
      } else {
        await createTag({ name: newTagName.trim() });
      }

      await loadTags();
      setModalVisible(false);
    } catch {
      const msg = editingTag ? "Falha ao editar tag" : "Falha ao criar tag";
      setErrorMessage(msg);
      setErrorModalVisible(true);
    }
  };

  // Abre modal de confirmação de exclusão
  const openDeleteModal = (tag: Tag) => {
    setToDeleteTag(tag);
    setDeleteModalVisible(true);
  };

  // Confirma exclusão
  const handleConfirmDelete = async () => {
    if (!toDeleteTag) return;

    setDeleteModalVisible(false);

    try {
      await deleteTag(String(toDeleteTag.id));
      setTags(prevList => prevList.filter(item => item.id !== toDeleteTag.id));
    } catch {
      setErrorMessage("Não foi possível excluir esta tag");
      setErrorModalVisible(true);
    } finally {
      setDeleteModalVisible(false);
      setToDeleteTag(null);
    }
  };

  // Itens da lista
  const renderTagItem = ({ item }: { item: Tag }) => (
    <Pressable
      onPress={() => {openEditModal(item)}}
    >
      {({ pressed }) => (
        <View className={`flex flex-row items-center justify-between p-4 rounded-lg shadow mb-4 border border-iconbg gap-3 ${pressed ? "bg-background/80" : "bg-background"}`}>
          <View className="flex-1 flex-row items-center gap-4">
            <View className="flex items-center justify-center rounded ml-1">
              <FontAwesomeIcon icon={faTag} size={24} color="#a9c3f4ff" />
            </View>

            <Text className="text-white font-poppins">{item.name}</Text>
          </View>

          {/* Botão de deletar evento */}
          <Pressable onPress={(e) => {
            e.stopPropagation();
            openDeleteModal(item);
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
          Nenhuma tag encontrada
        </Text>
      </View>
    );
  };

  const listStatusHeader = <>{error && <Text className="text-red-400 text-center mt-2">{error}</Text>}</>;
  const pageHeader = (
    <>
      {Platform.OS === "web" && <ParticipantViewToggle />}
      <BackButton />

      <View className="mb-8">
        <Text className="text-white text-2xl font-poppinsSemiBold mb-2">Painel de tags </Text>
        <Text className="text-gray-400 font-inter">Painel de administração das tags dos patrocinadores</Text>
      </View>

      <Button title="Criar Tag" onPress={openCreateModal} />
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
              data={tags}
              renderItem={renderTagItem}
              ListEmptyComponent={emptyList}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 36 }}
            />
          </View>
        </View>
      </View>

      <CreationEditionOverlay
        visible={modalVisible}
        title={editingTag ? "Editar Tag" : "Nova Tag"}
        confirmText={editingTag ? "Salvar" : "Criar"}
        onCancel={() => setModalVisible(false)}
        onConfirm={handleSave}
      >
        <Input>
          <Input.Field
            placeholder="Nome da tag"
            value={newTagName}
            onChangeText={setNewTagName}
            autoFocus
          />
        </Input>
      </CreationEditionOverlay>

      <ConfirmationOverlay
          visible={deleteModalVisible}
          title="Confirmar exclusão"
          message="Tem certeza que deseja remover esta tag?"
          onCancel={() => {setDeleteModalVisible(false)}}
          onConfirm={handleConfirmDelete}
          confirmText="Excluir"
      />

      <ErrorOverlay
        visible={errorModalVisible}
        title="Erro"
        message={errorMessage}
        onConfirm={() => {setErrorModalVisible(false)}}
        confirmText="OK"
      />

      <WarningOverlay
        visible={warningModalVisible}
        title="Aviso"
        message="Não deixe o nome da Tag vazio!"
        onConfirm={() => {setWarningModalVisible(false)}}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}
