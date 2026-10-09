import ParticipantViewToggle from "../../components/app/participantViewToggle";
import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, StatusBar, Platform, ActivityIndicator, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, ParamListBase, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { updateActivity, getActivityId } from "../../services/activities";
import { createActivityImage, getImagesByActivityId, updateActivityImageById, deleteActivityImageById } from "../../services/activityImage";
import { getCategories } from "../../services/categories";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { colors } from "../../styles/colors";
import { Input } from "../../components/input/input";
import * as ImagePicker from "expo-image-picker";
import ConfirmationOverlay from "../../components/overlay/confirmationOverlay";
import ErrorOverlay from "../../components/overlay/errorOverlay";
import WarningOverlay from "../../components/overlay/warningOverlay";
import BackButton from "../../components/button/backButton";
import Button from "../../components/button/button";
import DatePicker from "react-datepicker";
import FontAwesome from '@expo/vector-icons/FontAwesome';

type ActivityAdminCreateNavigationProp = NativeStackNavigationProp<ParamListBase>;

type RouteParams = {
  ActivityAdminCreate: {
    id?: string;
  };
};

export default function ActivityAdminUpdate() {
  const navigation = useNavigation<ActivityAdminCreateNavigationProp>();
  const route = useRoute<RouteProp<RouteParams, "ActivityAdminCreate">>();
  const activityId = route.params?.id;

  const [name, setName] = useState<string>("");
  const [speakerName, setSpeakerName] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<Date>(new Date());
  const [vacancies, setVacancies] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [points, setPoints] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [activityImage, setActivityImage] = useState<string | null>(null);
  const [speakerImage, setSpeakerImage] = useState<string | null>(null);
  const [originalActivityImage, setOriginalActivityImage] = useState<string | null>(null);
  const [originalSpeakerImage, setOriginalSpeakerImage] = useState<string | null>(null);
  const [activityImageId, setActivityImageId] = useState<string>();
  const [speakerImageId, setSpeakerImageId] = useState<string>();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; type: "atividade" | "palestrante" } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("Erro");
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  const [warningMessage, setWarningMessage] = useState("Aviso");
  const [warningModalVisible, setWarningModalVisible] = useState(false);

  // Busca as categorias
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
          const fetchedCategories = await getCategories();
          if (isActive) {
            setCategories(fetchedCategories);
            // Se ainda não tiver categoria selecionada, seleciona a primeira
            if (fetchedCategories.length > 0 && !selectedCategoryId) {
              setSelectedCategoryId(fetchedCategories[0].id);
            }
            setCategoriesError(null);
          }
        } catch (err) {
          console.error("Erro ao buscar categorias:", err);
          if (isActive) {
            setCategoriesError("Não foi possível carregar as categorias.");
          }
        } finally {
          if (isActive) {
            setCategoriesLoading(false);
          }
        }
      };

      fetchCategories();

      return () => {
        isActive = false;
      };
    }, [selectedCategoryId])
  );

  // Busca os dados da atividade
  useEffect(() => {
    if (!activityId) return;

    const abortController = new AbortController();

    const fetchActivityData = async () => {
      setIsLoading(true);
      try {
        const [activity, images] = await Promise.all([
          getActivityId(activityId),
          getImagesByActivityId(activityId),
        ]);

        if (abortController.signal.aborted) return;

        // Dados principais da atividade
        setName(activity.nome);
        setSpeakerName(activity.palestranteNome);

        const activityDate = new Date(activity.data);
        const offsetDate = new Date(activityDate.getTime() + activityDate.getTimezoneOffset() * 60000);
        setDate(offsetDate);
        setTime(offsetDate);

        setVacancies(String(activity.vagas));
        setDetails(activity.detalhes);
        setPoints(String(activity.points));
        setLocation(activity.local);
        setSelectedCategoryId(activity.categoriaId);

        // Imagens
        images.forEach((img) => {
          if (img.typeOfImage === "palestrante") {
            setSpeakerImage(img.imageUrl);
            setOriginalSpeakerImage(img.imageUrl);
            setSpeakerImageId(img.id);
          } else {
            setActivityImage(img.imageUrl);
            setOriginalActivityImage(img.imageUrl);
            setActivityImageId(img.id);
          }
        });
      } catch (err) {
        if (!abortController.signal.aborted) {
          setErrorMessage("Não foi possível carregar os dados da atividade");
          setErrorModalVisible(true);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchActivityData();

    return () => {
      abortController.abort();
    };
  }, [activityId]);

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onChangeTime = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  // Função para compatibilidade das imagens em web e mobile
  const appendImageToFormData = async (formData: FormData, uri: string, typeOfImage: string) => {
    formData.append("typeOfImage", typeOfImage);
    if (Platform.OS === "web") {
      const file = await fetch(uri).then(r => r.blob());
      formData.append("image", file, `${typeOfImage}.jpg`);
    } else {
      formData.append("image", {
        uri,
        name: `${typeOfImage}.jpg`,
        type: "image/jpeg",
      } as any);
    }
  };

  // Função para abrir a galeria e selecionar imagem
  const pickImage = async (setImage: React.Dispatch<React.SetStateAction<string | null>>) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setWarningMessage("Permissão para acessar imagens foi negada");
      setWarningModalVisible(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  // Função para abrir o overlay de confirmação
  const confirmDeleteImage = (id: string, type: "atividade" | "palestrante") => {
    setImageToDelete({ id, type });
    setConfirmVisible(true);
  };

  // Função para confirmar exclusão
  const handleDeleteImage = async () => {
    if (!imageToDelete) return;
    try {
      await deleteActivityImageById(imageToDelete.id);

      if (imageToDelete.type === "atividade") {
        setActivityImage(null);
        setOriginalActivityImage(null);
        setActivityImageId(undefined);
      } else {
        setSpeakerImage(null);
        setOriginalSpeakerImage(null);
        setSpeakerImageId(undefined);
      }
    } catch (err) {
      setErrorMessage("Não foi possível excluir a imagem.");
      setErrorModalVisible(true);
    } finally {
      setConfirmVisible(false);
      setImageToDelete(null);
    }
  };

  const handleUpdateActivity = async () => {
    if (!activityId)
      return;

    if (
      !name.trim() ||
      !speakerName.trim() ||
      !vacancies.trim() ||
      !details.trim() ||
      !points.trim() ||
      !location.trim() ||
      !selectedCategoryId
    ) {
      setWarningMessage("Por favor, preencha todos os campos e selecione uma categoria");
      setWarningModalVisible(true);
      return;
    }

    const parsedVacancies = parseInt(vacancies, 10);
    const parsedPoints = parseInt(points, 10);

    if (isNaN(parsedVacancies) || parsedVacancies < 0) {
      setWarningMessage("O número de vagas deve ser um valor numérico positivo");
      setWarningModalVisible(true);
      return;
    }

    if (isNaN(parsedPoints) || parsedPoints < 0) {
      setWarningMessage("A pontuação deve ser um valor numérico positivo")
      setWarningModalVisible(true);
      return;
    }

    setIsLoading(true);

    try {
      const dateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.getHours(),
        time.getMinutes()
      );

      const adjustedDateTime = new Date(dateTime.getTime() - dateTime.getTimezoneOffset() * 60000);

      const activityData = {
        nome: name,
        palestranteNome: speakerName,
        data: adjustedDateTime.toISOString(),
        vagas: parsedVacancies,
        detalhes: details,
        points: parsedPoints,
        categoriaId: selectedCategoryId,
        local: location,
      };

      await updateActivity(activityId, activityData);

      // Atualiza imagens apenas se foram alteradas (uri local do dispositivo)
      const uploadPromises: Promise<any>[] = [];

      // Atividade
      if (activityImage && activityImage !== originalActivityImage) {
        const formDataActivity = new FormData();
        formDataActivity.append("activityId", activityId);
        await appendImageToFormData(formDataActivity, activityImage, "atividade");

        if (activityImageId) {
          uploadPromises.push(updateActivityImageById(activityImageId, formDataActivity));
        } else {
          uploadPromises.push(createActivityImage(formDataActivity));
        }
      }

      // Palestrante
      if (speakerImage && speakerImage !== originalSpeakerImage) {
        const formDataSpeaker = new FormData();
        formDataSpeaker.append("activityId", activityId);
        await appendImageToFormData(formDataSpeaker, speakerImage, "palestrante");

        if (speakerImageId) {
          uploadPromises.push(updateActivityImageById(speakerImageId, formDataSpeaker));
        } else {
          uploadPromises.push(createActivityImage(formDataSpeaker));
        }
      }

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      navigation.goBack();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Falha ao atualizar a atividade.";
      setErrorMessage(errorMessage);
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const pageHeader = (
    <>
      {Platform.OS === "web" && <ParticipantViewToggle />}
      <BackButton />

      {/* Cabeçalho */}
      <View className="mb-8">
        <Text className="text-white text-2xl font-poppinsSemiBold mb-2">{activityId ? "Editar atividade" : "Criar nova atividade"}</Text>
        <Text className="text-blue-200 font-inter">
          {activityId ? "Atualize os dados da atividade." : "Adicione uma nova atividade ao evento!"}
        </Text>
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
            <View className="flex-col flex-1 w-full gap-4 text-center justify-start pb-8">
              {/* Nome da atividade */}
              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Nome da Atividade</Text>
                <Input>
                  <Input.Field placeholder="Ex.: Palestra de IA" onChangeText={setName} value={name} />
                </Input>
              </View>

              {/* Imagem da Atividade */}
              <View className="w-full mb-2">
                <Text className="text-gray-400 text-sm font-inter mb-2">Imagem da Atividade</Text>
                <View className="flex flex-row gap-3">
                  <Pressable
                    onPress={() => pickImage(setActivityImage)}
                    className="flex-1 h-[56px] px-5 bg-background rounded-lg border border-border flex-row items-center justify-center"
                  >
                    <Text className="text-gray-200 text-sm font-interMedium">
                      {activityImage ? "Trocar Imagem" : "Selecionar Imagem"}
                    </Text>
                  </Pressable>

                  {activityImage &&
                    <Pressable
                      onPress={() => confirmDeleteImage(activityImageId!, "atividade")}
                      className="w-[56px] h-[56px] flex items-center justify-center bg-danger/10 rounded-lg border border-danger"
                    >
                      <FontAwesome name="trash" size={20} color={colors.danger} />
                    </Pressable>
                  }
                </View>

                {activityImage && (
                  <Image
                    source={{ uri: activityImage }}
                    className="w-full h-[260px] mt-3 rounded-lg"
                    resizeMode="cover"
                  />
                )}
              </View>

              {/* Nome do Apresentador(a) */}
              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Nome do Apresentador(a)</Text>
                <Input>
                  <Input.Field placeholder="Ex.: João Silva" onChangeText={setSpeakerName} value={speakerName} />
                </Input>
              </View>

              {/* Imagem do Apresentador(a) */}
              <View className="w-full mb-2">
                <Text className="text-gray-400 text-sm font-inter mb-2">Imagem do Apresentador(a)</Text>

                <View className="flex flex-row gap-3">
                  <Pressable
                    onPress={() => pickImage(setSpeakerImage)}
                    className="flex-1 p-4 bg-background rounded-lg border border-border flex-row items-center justify-center"
                  >
                    <Text className="text-gray-200 text-sm font-interMedium">
                      {speakerImage ? "Trocar Imagem" : "Selecionar Imagem"}
                    </Text>
                  </Pressable>

                  {speakerImage &&
                    <Pressable
                      onPress={() => confirmDeleteImage(speakerImageId!, "palestrante")}
                      className="w-[56px] h-[56px] flex items-center justify-center bg-danger/10 rounded-lg border border-danger"
                    >
                      <FontAwesome name="trash" size={20} color={colors.danger} />
                    </Pressable>
                  }
                </View>

                {speakerImage && (
                  <Image
                    source={{ uri: speakerImage }}
                    className="w-full h-[260px] mt-3 rounded-lg"
                    resizeMode="cover"
                  />
                )}
              </View>

              {/* Data da atividade */}
              <View className="w-full mb-2">
                {Platform.OS === "web" ? (
                  <View>
                    <Text className="text-gray-400 text-sm font-inter mb-2">Data</Text>
                    <DatePicker
                      selected={date}
                      onChange={(date: Date | null) => {
                        if (date) setDate(date);
                      }}
                      locale={ptBR}
                      dateFormat="dd/MM/yyyy"
                      popperClassName="z-50"
                      portalId="root"
                      customInput={
                        <View
                          className={`w-full h-[56px] px-5 bg-background rounded-lg border border-border flex-row items-center`}>
                          <Text className="text-white font-inter text-sm">{date.toLocaleDateString("pt-BR")}</Text>
                        </View>
                      }
                    />
                  </View>
                ) : (
                  <Pressable onPress={() => setShowDatePicker(true)}>
                    <Text className="text-gray-400 text-sm font-inter mb-2">Data</Text>
                    <View
                      className="w-full h-[56px] px-5 bg-background rounded-lg border border-border flex-row items-center"
                      pointerEvents="none"
                    >
                      <Text className="text-white font-inter text-sm">{`${date.toLocaleDateString("pt-BR")}`}</Text>
                    </View>
                  </Pressable>
                )}
              </View>

              {/* Horário da atividade */}
              <View className="w-full mb-2">
                {Platform.OS === "web" ? (
                  <View>
                    <Text className="text-gray-400 text-sm font-inter mb-2">Horário</Text>
                    <DatePicker
                      selected={time}
                      onChange={(time: Date | null) => {
                        if (time) setTime(time);
                      }}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={5}
                      timeCaption="Hora"
                      dateFormat="HH:mm"
                      locale={ptBR}
                      popperClassName="z-50"
                      portalId="root"
                      customInput={
                        <View className="w-full h-[56px] px-5 bg-background rounded-lg border border-border flex-row items-center">
                          <Text className="text-white font-inter text-sm">{format(time, "HH:mm")}</Text>
                        </View>
                      }
                    />
                  </View>
                ) : (
                  <Pressable onPress={() => setShowTimePicker(true)}>
                    <Text className="text-gray-400 text-sm font-inter mb-2">Horário</Text>
                    <View
                      className="w-full h-[56px] px-5 bg-background rounded-lg border border-border flex-row items-center"
                      pointerEvents="none"
                    >
                      <Text className="text-white font-inter text-sm">{format(time, "HH:mm", { locale: ptBR })}</Text>
                    </View>
                  </Pressable>
                )}
              </View>

              {/* Local */}
              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Local</Text>
                <Input>
                  <Input.Field placeholder="Ex.: Auditório" onChangeText={setLocation} value={location} />
                </Input>
              </View>

              {/* Vagas */}
              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Número de Vagas</Text>
                <Input>
                  <Input.Field placeholder="Ex.: 50" onChangeText={setVacancies} value={vacancies} keyboardType="numeric" />
                </Input>
              </View>

              {/* Detalhes */}
              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Detalhes</Text>
                <Input>
                  <Input.Field placeholder="Detalhes da atividade" onChangeText={setDetails} value={details} />
                </Input>
              </View>


              {/* Pontos */}
              <View className="w-full">
                <Text className="text-gray-400 text-sm font-inter mb-2">Pontos</Text>
                <Input>
                  <Input.Field
                    placeholder="Pontuação da atividade"
                    onChangeText={setPoints}
                    value={points}
                    keyboardType="numeric"
                  />
                </Input>
              </View>

              {/* Categoria */}
              <View className="w-full mb-4">
                <Text className="text-gray-400 text-sm font-inter mb-3">Categoria</Text>
                {categoriesLoading ? (
                  <ActivityIndicator size="small" color={colors.blue[500]} />
                ) : categoriesError ? (
                  <Text className="text-danger text-sm">{categoriesError}</Text>
                ) : (
                  <View className="flex-row flex-wrap gap-3 mb-2">
                    {categories.map((category) => {
                      const isSelected = selectedCategoryId === category.id;
                      return (
                        <Pressable
                          key={category.id}
                          onPress={() => setSelectedCategoryId(category.id)}
                          className={`px-4 py-2 rounded-full border ${
                            isSelected ? "bg-blue-500/10 border-blue-500" : "border-gray-600"
                          }`}
                        >
                          <Text className={isSelected ? "text-blue-500 font-interMedium" : "text-gray-400 font-interMedium"}>
                            {category.nome}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <Button title="Atualizar" className="mt-auto" loading={isLoading} onPress={handleUpdateActivity} />
            </View>
          </ScrollView>
        </View>
      </View>

      {Platform.OS !== "web" && (
        <>
          {showDatePicker && <DateTimePicker value={date} mode="date" onChange={onChangeDate} />}
          {showTimePicker && <DateTimePicker value={time} mode="time" onChange={onChangeTime} />}
        </>
      )}

      <ConfirmationOverlay visible={confirmVisible} title="Excluir imagem" message="Tem certeza que deseja excluir esta imagem?" onCancel={() => setConfirmVisible(false)} onConfirm={handleDeleteImage} confirmText="Excluir" cancelText="Cancelar" confirmButtonColor="#dc2626"/>
      <ErrorOverlay visible={errorModalVisible} title="Erro" message={errorMessage} onConfirm={() => setErrorModalVisible(false)} confirmText="OK" />
      <WarningOverlay visible={warningModalVisible} title="Aviso" message={warningMessage} onConfirm={() => setWarningModalVisible(false)} confirmText="OK" />
    </SafeAreaView>
  );
}
