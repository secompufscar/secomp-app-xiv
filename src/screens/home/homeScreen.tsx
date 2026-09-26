import { useCallback, useState } from "react";
import { Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ParamListBase, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { BeautifulName } from "beautiful-name";
import { useAuth } from "../../hooks/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { colors } from "../../styles/colors";
import { getCurrentEvent } from "../../services/events";
import { createRegistration, getRegistrationByUserIdAndEventId } from "../../services/userEvents";
import AppLayout from "../../components/app/appLayout";
import HomeEventSubscription from "../../components/home/homeEventSubscription";
import HomeCompetitions from "../../components/home/homeCompetitions";
import HomeSocials from "../../components/home/homeSocials";
import IconButton from "../../components/button/iconButton";
import ConfirmationOverlay from "../../components/overlay/confirmationOverlay";
import ErrorOverlay from "../../components/overlay/errorOverlay";

export default function Home() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { user }: any = useAuth();
  const [eventStatusMessage, setEventStatusMessage] = useState("Carregando informações do evento...");
  const [errorMessage, setErrorMessage] = useState("Erro");
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [isUserSubscribed, setIsUserSubscribed] = useState(false);
  const [isEventActive, setIsEventActive] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Events | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | "subscribe" | "unsubscribe">(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setConfirmAction(null);
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchEventData = async () => {
        try {
          const event = await getCurrentEvent();
          if (!isActive) return;

          setCurrentEvent(event);

          if (event) {
            const today = new Date();
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);

            // Permite inscrição 1 mês anterior ao evento
            const startOneMonthBefore = new Date(start);
            startOneMonthBefore.setMonth(startOneMonthBefore.getMonth() - 1);

            setIsEventActive(today >= startOneMonthBefore && today <= end);

            const message = getEventStatusMessage(event);
            setEventStatusMessage(message);
          } else {
            setIsEventActive(false);
            setEventStatusMessage("Nenhum evento ativo no momento");
          }

          if (event?.id && user?.id) {
            const registration = await getRegistrationByUserIdAndEventId(user.id, event.id);
            if (!isActive) return;

            setIsUserSubscribed(!!registration);
          } else {
            setIsUserSubscribed(false);
          }
        } catch (error) {
          console.error("Erro ao buscar dados do evento:", error);
          if (!isActive) return;

          setIsUserSubscribed(false);
          setIsEventActive(false);
          setEventStatusMessage("Não foi possível carregar o evento");
        }
      };

      fetchEventData();

      return () => {
        isActive = false;
      };
    }, [user])
  );

  const subscribe = async (): Promise<boolean> => {
    if (isSubscribing) return false;

    setIsSubscribing(true);
    try {
      if (!user?.id || !currentEvent?.id) throw new Error("Usuário ou evento inválido");
      await createRegistration({ eventId: currentEvent.id });
      setIsUserSubscribed(true);
      return true;
    } catch (error: any) {
      handleError(error.response?.data?.message || "Não foi possível realizar a inscrição");
      return false;
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  // Mensagem baseada no horário do dia
  const getCurrentTime = () => {
    const hours = new Date().getHours();
    if (hours < 12) {
      return "Bom dia,";
    } else if (hours >= 12 && hours < 18) {
      return "Boa tarde,";
    } else {
      return "Boa noite,";
    }
  };

  // Mensagem baseada no dia do evento
  const getEventStatusMessage = (event: Events): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Converte as strings de data da API (que estão em formato ISO 8601) para objetos Date.
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    // Também normaliza as datas do evento para o início do dia no fuso horário local.
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    if (today < startDate) {
      return "O evento ainda não começou";
    }

    if (today > endDate) {
      return "O evento já terminou. Até a próxima!";
    }

    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentEventDay = diffDays + 1;

    if (today.getTime() === endDate.getTime()) {
      return "Hoje é o último dia de evento";
    }

    return `Hoje é o ${currentEventDay}° dia de evento`;
  };

  const greeting = getCurrentTime();
  const nomeCompleto = new BeautifulName(user.nome || "").beautifulName;
  const nomes = nomeCompleto.trim().split(" ");

  const primeiroNome = nomes[0];
  const ultimoNome = nomes.length > 1 ? nomes[nomes.length - 1] : "";
  const nomeParaMostrar =
    ultimoNome && ultimoNome !== primeiroNome ? `${primeiroNome} ${ultimoNome}` : primeiroNome;

  return (
    <SafeAreaView className="bg-blue-900 flex-1 items-center">
      <AppLayout>
        <View className="w-full flex-row items-center justify-between mt-10 mb-6 gap-4">
          <View className="flex-col h-full flex-1 ">
            <Text className="text-base text-blue-100 font-inter">{eventStatusMessage}</Text>
            <View className="flex-row items-center justify-start mt-[6px]">
              <Text className="text-[18px] text-white font-poppinsSemiBold">{greeting} </Text>
              <Text className="text-[18px] text-green font-poppinsSemiBold">{`${nomeParaMostrar}`}</Text>
            </View>
          </View>

          {/* Notificações */}
          <Pressable
            onPress={() => {
              navigation.navigate("Notifications");
            }}
            className="active:opacity-80"
          >
            <View className="w-11 h-11 flex items-center justify-center rounded-[8px] p-2 bg-iconbg">
              <FontAwesomeIcon icon={faBell} size={20} color={colors.blue[200]} />
            </View>
          </Pressable>
        </View>

        {/* Inscrição no evento */}
        {!isUserSubscribed && 
          <HomeEventSubscription
            isEventActive={isEventActive}
            isUserSubscribed={isUserSubscribed}
            onSubscribeRequest={() => setConfirmAction("subscribe")}
          />
        }

        {/* Minhas atividades */}
        <View className="w-full mb-8 gap-4">
          <Text className="text-sm text-green font-poppinsMedium">Minhas atividades</Text>
          
          <IconButton 
            title="Sua programação para o evento"
            subtitle="Pronto para hoje?"
            subtitleAlt="Pronto para hoje?"
            icon={require("../../../assets/icons/book.png")}
            onPress={() => navigation.navigate("MyEvents")}
          />
        </View>

        {/* Guia do evento */}
        <View className="w-full mb-8 gap-4">
          <Text className="text-sm text-green font-poppinsMedium">Guia do evento</Text>
          
          <IconButton 
            title="Como participar da Secomp?"
            subtitle="Um guia com tudo o que você precisa!"
            subtitleAlt="Um guia contendo tudo!"
            icon={require("../../../assets/icons/guidebook.png")}
            onPress={() => navigation.navigate("EventGuide")}
          />
        </View>

        {/* Competições */}
        <View className="w-full mb-8 gap-1">
          <Text className="text-sm text-green font-poppinsSemiBold">Competições</Text>
          <HomeCompetitions />
        </View>

        {/* Patrocinadores */}
        <View className="w-full mb-8 gap-4">
          <Text className="text-sm text-green font-poppinsSemiBold">Nossos apoiadores</Text>

          <IconButton 
            title="Conheça nossos patrocinadores!"
            subtitle="Descubra as empresas que confiam em nós"
            subtitleAlt="Empresas que confiam em nós"
            icon={require("../../../assets/icons/stall.png")}
            onPress={() => navigation.navigate("Sponsors")}
          />
        </View>

        {/* Ranking*/}
        <View className="w-full mb-8 gap-4">
          <Text className="text-sm text-green font-poppinsSemiBold">Ranking</Text>

          <IconButton 
            title="Top 50"
            subtitle="Participantes que estão liderando o evento"
            subtitleAlt="Os melhores do evento!"
            icon={require("../../../assets/icons/ranking.png")}
            onPress={() => navigation.navigate("Ranking")}
          />
        </View>

        {/* Redes sociais */}
        <View className="w-full mb-24 gap-4">
          <Text className="text-sm text-green font-poppinsSemiBold">Redes sociais</Text>
          <HomeSocials />
        </View>
      </AppLayout>

      <ConfirmationOverlay
        visible={!!confirmAction}
        title={"Confirmar inscrição"}
        message={"Você deseja se inscrever neste evento?"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          const subscribed = await subscribe();
          setConfirmAction(null);
          if (subscribed && currentEvent) {
            navigation.navigate("EventConfirmation", { event: currentEvent });
          }
        }}
        confirmText="Confirmar"
        confirmButtonColor={colors.blue[500]}
      />

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
