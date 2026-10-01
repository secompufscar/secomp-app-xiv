import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking, StatusBar, Platform, ScrollView, Image, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, ParamListBase } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faLocationDot, faCalendarDay, faUser, faUserClock, faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../hooks/AuthContext";
import { userSubscription, subscribeToActivity, unsubscribeToActivity, getActivityEnrollmentSummary } from "../../services/userAtActivities";
import { getImagesByActivityId } from "../../services/activityImage";
import { getCategories } from "../../services/categories";
import { colors } from "../../styles/colors";
import { format, parseISO, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import BackButton from "../../components/button/backButton";
import Button from "../../components/button/button";
import InfoRow from "../../components/info/infoRow";
import ErrorOverlay from "../../components/overlay/errorOverlay";

export default function ActivityDetails() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const route = useRoute();
  const { item: activity } = route.params as { item: Activity };
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isUserOnWaitlist, setIsUserOnWaitlist] = useState(false);
  const [category, setCategory] = useState<Category | undefined>(activity.categoria);

  // Vagas da atividade
  const [subscribedCount, setSubscribedCount] = useState(0);
  const [waitingListCount, setWaitingListCount] = useState(0);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);

  // Imagens da atividade
  const [palestranteImageUrl, setPalestranteImageUrl] = useState("");
  const [activityImageUrl, setActivityImageUrl] = useState("");

  // Controle dos botões
  const [isPressed, setIsPressed] = useState(false);
  const [isBtnPressed, setIsBtnPressed] = useState(false);

  // Overlay de erro
  const [errorMessage, setErrorMessage] = useState("Erro");
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  const requiresEnrollment = category?.requiresEnrollment ?? false;

  // Obtém apenas os números agregados e a posição do usuário autenticado.
  const fetchParticipantsCounts = async () => {
    if (!requiresEnrollment) return;

    try {
      const summary = await getActivityEnrollmentSummary(activity.id);
      setSubscribedCount(summary.occupiedCount);
      setWaitingListCount(summary.waitlistCount);
      setWaitlistPosition(summary.waitlistPosition);
    } catch (error) {
      console.error("Erro ao buscar resumo de inscrições:", error);
    }
  };

  useEffect(() => {
    if (activity.categoria) return;

    getCategories()
      .then((categories) => setCategory(categories.find((item) => item.id === activity.categoriaId)))
      .catch((error) => console.error("Erro ao buscar categoria:", error));
  }, [activity.categoria, activity.categoriaId]);

  // Verifica a inscrição do usuário na atividade
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || user.tipo === "ADMIN") {
        setSubscriptionLoading(false);
        return;
      }

      setSubscriptionLoading(true);
      try {
        const response = await userSubscription(user.id, activity.id);
        setIsUserOnWaitlist(response.listaEspera);
        if (response?.inscricaoPrevia === true || response?.listaEspera === true) {
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
      } catch (error: any) {
        setIsSubscribed(false);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    checkSubscription();
    fetchParticipantsCounts();
  }, [user, activity.id, requiresEnrollment]);

  // Carrega as imagens da atividade
  useEffect(() => {
    const fetchImagesByActivityId = async () => {
      const apiResponse = await getImagesByActivityId(activity.id);

      apiResponse.map((e) => {
        if (e.typeOfImage === "palestrante") {
          setPalestranteImageUrl(e.imageUrl);
        } else {
          setActivityImageUrl(e.imageUrl);
        }
      });
    };

    fetchImagesByActivityId();
  }, [activity.id]);

  const handleSubscription = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeToActivity(user.id, activity.id);
        setIsSubscribed(false);
        setIsUserOnWaitlist(false);
        setWaitlistPosition(null);
      } else {
        const subscription = await subscribeToActivity(user.id, activity.id);
        setIsSubscribed(true);
        setIsUserOnWaitlist(subscription.listaEspera);
      }

      await fetchParticipantsCounts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Erro ao alterar status de inscrição";
      setErrorMessage(errorMessage);
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanPresence = () => {
    navigation.navigate("QRCode", { id: activity.id });
  };

  const getDate = () => format(addHours(parseISO(activity.data), 3), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const getTime = () => format(addHours(parseISO(activity.data), 3), "HH:mm'h'", { locale: ptBR });
  const categoryName = category?.nome || "Secomp";

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <View className="flex-1 w-full">
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={Platform.OS === "android"}
        />

        {/* Imagem da atividade */}
        <View className="w-full h-[280px] relative -mt-10">
          {activityImageUrl !== "" ? (
            <ImageBackground
              source={{ uri: activityImageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full flex items-center justify-center bg-background pt-10">
              <FontAwesome6 name="image" size={56} color={colors.border}/>
            </View>
          )}
          <View className="absolute top-6 left-6">
            <BackButton />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 w-full"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingBottom: 32 }}
        >
          <View className="w-full px-6 max-w-[1000px] mx-auto mt-6">
            {/* Título da atividade */}
            <View className="mb-6">
              <Text className="text-gray-400 font-inter text-base">{categoryName}</Text>
              <Text className="text-white text-xl font-poppinsSemiBold mt-1">{activity.nome}</Text>
            </View>

            {/* Informações */}
            <View className="mb-6">
              <InfoRow icon={faLocationDot} mainText="UFSCar" subText={activity.local}>
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("UFSCar " + activity.local)}`
                    )
                  }
                  onPressIn={() => setIsPressed(true)}
                  onPressOut={() => setIsPressed(false)}
                >
                  <Text
                    className={`text-sm text-blue-500 font-interMedium p-2 border-[1px] border-blue-500 rounded-md ${
                      isPressed ? "bg-blue-500/20" : "bg-blue-500/10"
                    }`}
                  >
                    Ver no mapa
                  </Text>
                </Pressable>
              </InfoRow>

              <InfoRow
                icon={faCalendarDay}
                mainText={getDate()}
                subText={getTime()}
              />

              {requiresEnrollment && <View className="flex flex-row w-full gap-4">
                <InfoRow
                  icon={faUser}
                  mainText="Vagas"
                  subText={activity.vagas > 0 && activity.vagas < 999 ? `${subscribedCount} / ${activity.vagas}` : "Ilimitadas"}
                  className="flex-1"
                />

                <InfoRow
                  icon={faUserClock}
                  mainText="Lista de Espera"
                  subText={`${waitingListCount}`}
                  className="flex-1"
                />
              </View>}
            </View>

            {/* Detalhes */}
            <View className="mb-10">
              <Text className="text-white text-lg font-poppinsSemiBold mb-1">Detalhes</Text>
              <Text className="text-gray-400 font-inter leading-relaxed">
                {activity.detalhes}
              </Text>
            </View>

            {/* Palestrante */}
            <View className="mb-10">
              <View className="flex-row items-center">
                {palestranteImageUrl !== "" ? (
                  <Image
                    source={{ uri: palestranteImageUrl }}
                    style={{ width: 56, height: 56, resizeMode: "cover" }}
                    className="rounded-full"
                  />
                ) : (
                  <FontAwesomeIcon icon={faUserCircle} size={56} color={colors.border} />
                )}

                <View className="flex-1 ml-4">
                  <Text className="text-white text-base font-poppinsSemiBold">
                    Apresentador
                  </Text>
                  <Text className="text-gray-400 font-inter leading-[1.8]">{activity.palestranteNome}</Text>
                </View>
              </View>
            </View>
          </View> 
          
          {isSubscribed && requiresEnrollment &&
            <View className="w-full mb-6 flex items-start justify-center px-6 max-w-[1000px] mx-auto">
                {isUserOnWaitlist ? (
                <Text className="text-blue-500 font-inter px-5 py-3 border border-blue-500 rounded-lg bg-blue-500/10">
                  Você está na lista de espera 
                  {waitlistPosition ? ` (posição ${waitlistPosition})` : ""}
                </Text>
              ) : (
                <Text className="text-blue-500 font-inter px-5 py-3 border border-blue-500 rounded-lg bg-blue-500/10">
                  Sua vaga está garantida!
                </Text>
              )}
            </View>
          }

          {/* Botão final */}
          <View className="w-full px-6 max-w-[1000px] mx-auto">
            {user?.tipo === "ADMIN" ? (
              <View className="flex flex-row gap-4">
                <Button title="Ler Presença" onPress={handleScanPresence} className="flex-1" />
                <Button
                  title="Participantes"
                  bgColor="bg-gray-700"
                  className="w-[40%]"
                  onPress={() =>
                    navigation.navigate("ParticipantsList", {
                      activityId: activity.id,
                      activityName: activity.nome,
                    })
                  }
                />
              </View>
            ) : (
              subscriptionLoading || isLoading ? (
                <ActivityIndicator size="large" color={colors.blue[500]} />
              ) : (
                <Pressable
                  onPress={handleSubscription}
                  onPressIn={() => setIsBtnPressed(true)}
                  onPressOut={() => setIsBtnPressed(false)}
                >
                  <View
                    className={`w-full px-4 h-[56px] px-5 items-center justify-center rounded-lg transition-transform duration-100 transform 
                      ${isSubscribed ? "bg-border" : "bg-blue-500 "} 
                      ${isBtnPressed ? "opacity-80" : "opacity-100"}`}
                  >
                    <Text className="text-white text-base font-interMedium">
                      {requiresEnrollment
                        ? isSubscribed
                          ? "Cancelar Inscrição"
                          : "Inscrever-se"
                        : isSubscribed
                          ? "Deixar de seguir"
                          : "Salvar atividade"}
                    </Text>
                  </View>
                </Pressable>
              )
            )}
          </View>
        </ScrollView>
      </View>

      <ErrorOverlay
        visible={errorModalVisible}
        title="Erro"
        message={errorMessage}
        onConfirm={() => {setErrorModalVisible(false)}}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}
