import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { useEffect, useState } from "react"
import { View, Text, ActivityIndicator, Pressable, StatusBar, Platform, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { ParamListBase, useNavigation } from "@react-navigation/native"
import { Input } from "../../components/input/input"
import { createSponsor } from "../../services/sponsors"
import { getTags } from "../../services/tags";
import { colors } from "../../styles/colors"
import BackButton from "../../components/button/backButton"
import Button from "../../components/button/button"
import ErrorOverlay from "../../components/overlay/errorOverlay";
import WarningOverlay from "../../components/overlay/warningOverlay"

interface Tag {
  id: string;
  name: string;
};

export default function SponsorsAdminCreate() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>()

  // Estados dos campos do formulário
  const [name, setName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [description, setDescription] = useState("")
  const [starColor, setStarColor] = useState("")
  const [link, setLink] = useState("")

  // Estados relacionados a tags
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);

  const [isLoading, setIsLoading] = useState(false)
  const [errorModalVisible, setErrorModalVisible] = useState(false)

  const [warningMessage, setWarningMessage] = useState("Aviso");
  const [warningModalVisible, setWarningModalVisible] = useState(false);

  // Ao montar o componente, busca todas as tags
  useEffect(() => {
    (async () => {
      try {
        const all = await getTags();
        setAllTags(all.map(tag => ({ id: tag.id ?? "", name: tag.name })));
      } catch {
        setWarningMessage("Não foi possível carregar as tags.");
        setWarningModalVisible(true);
      } finally {
        setLoadingTags(false);
      }
    })();
  }, []);

  // Alterna entre marcar/desmarcar uma tag
  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(x => x !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreate = async () => {
    setErrorModalVisible(false);

    if (!name.trim() || !logoUrl.trim() || !description.trim() || !starColor.trim() || !link.trim()) {
      setWarningMessage("Todos os campos são obrigatórios.");
      setWarningModalVisible(true);
      return;
    }

    const mappedStarColor = (() => {
      switch (starColor.toLowerCase()) {
        case "diamante":
          return "#4b8bf5"
        case "ouro":
          return "#F3C83D"
        case "prata":
          return "#B8D1E0"
        default:
          return "#cfcfcf42"
      }
    })()

    setIsLoading(true)

    try {
      await createSponsor({
        name,
        logoUrl,
        description,
        starColor: mappedStarColor,
        link,
        tagIds: selectedTagIds,
      })

      navigation.goBack()
    } catch (err) {
      console.error(err)
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false)
    }
  }

  const pageHeader = (
    <>
      {Platform.OS === "web" && <ParticipantViewToggle />}
      <BackButton />

      <View className="mb-8">
        <Text className="text-white text-2xl font-poppinsSemiBold mb-2">Criar novo patrocinador</Text>
        <Text className="text-blue-200 font-inter">Adicione um novo patrocinador para a Secomp!</Text>
      </View>
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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            {Platform.OS === "web" && pageHeader}
            <View className="flex-col flex-1 w-full text-center justify-start gap-4">
              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Nome do patrocinador</Text>
                <Input>
                  <Input.Field
                    placeholder="Nome do patrocinador"
                    value={name}
                    onChangeText={setName}
                  />
                </Input>
              </View>

              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Descrição</Text>
                <Input>
                  <Input.Field
                    placeholder="Descrição do patrocinador"
                    value={description}
                    onChangeText={setDescription}
                  />
                </Input>
              </View>

              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">URL do logo</Text>
                <Input>
                  <Input.Field
                    placeholder="URL"
                    value={logoUrl}
                    onChangeText={setLogoUrl}
                    autoCapitalize="none"
                  />
                </Input>
              </View>

              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Nível de patrocínio</Text>
                <Input>
                  <Input.Field
                    placeholder="Prata, Ouro ou Diamante"
                    value={starColor}
                    onChangeText={setStarColor}
                    autoCapitalize="none"
                  />
                </Input>
              </View>

              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Link para a página do patrocinador</Text>
                <Input>
                  <Input.Field
                    placeholder="Link para a empresa"
                    value={link}
                    onChangeText={setLink}
                    autoCapitalize="none"
                  />
                </Input>
              </View>

              <View className="w-full mb-4">
                <Text className="text-gray-400 text-sm font-inter mb-3">Tags</Text>
                {loadingTags
                  ? <ActivityIndicator color={colors.blue[200]} />
                  : (
                    <View className="flex-row flex-wrap gap-3 mb-2">
                      {allTags.map(tag => {
                        const selected = selectedTagIds.includes(tag.id);
                        return (
                          <Pressable
                            key={tag.id}
                            onPress={() => toggleTag(tag.id)}
                            className={`px-4 py-2 rounded-full border ${selected ? "bg-blue-500/10 border-blue-500" : "border-gray-600"}`}
                          >
                            <Text className={selected ? "text-blue-500 font-interMedium" : "text-gray-400 font-interMedium"}>
                              {tag.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )
                }
              </View>

              <Button title="Criar" className="mt-auto mb-8" loading={isLoading} onPress={handleCreate} />
            </View>
          </ScrollView>
        </View>
      </View>

      <ErrorOverlay
        visible={errorModalVisible}
        title="Erro na criação"
        message="Não foi possível criar este patrocinador"
        onConfirm={() => {setErrorModalVisible(false)}}
        confirmText="OK"
      />

      <WarningOverlay
        visible={warningModalVisible}
        title="Aviso"
        message={warningMessage}
        onConfirm={() => {setWarningModalVisible(false)}}
        confirmText="OK"
      />
    </SafeAreaView>
  )
}
