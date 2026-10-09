import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StatusBar, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ParamListBase, useFocusEffect, useNavigation } from "@react-navigation/native";
import { BeautifulName } from "beautiful-name";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faBell, faArrowRightFromBracket, faQrcode, faCalendarDays, faUser, faCalendarXmark } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../hooks/AuthContext";
import { getUserRanking, getProfile, getUserActivitiesCount } from "../../services/users";
import { colors } from "../../styles/colors";
import { getCurrentEvent } from "../../services/events";
import { deleteRegistration, getRegistrationByUserIdAndEventId } from "../../services/userEvents";
import BackButton from "../../components/button/backButton";
import EditButton from "../../components/button/editButton";
import ProfileButton from "../../components/button/profileButton";
import ErrorOverlay from "../../components/overlay/errorOverlay";
import ConfirmationOverlay from "../../components/overlay/confirmationOverlay";

export default function UserProfile() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { signOut, user: userFromContext, updateUser, isParticipantView }: any = useAuth();

  const [user, setUser] = useState(userFromContext);
  const [isUserSubscribed, setIsUserSubscribed] = useState(false);
  const [ranking, setRanking] = useState<number | null>(null);
  const [activities, setActivities] = useState(0);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  if (!user) {
    return (
      <SafeAreaView className="bg-blue-900 flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.blue[500]} />
      </SafeAreaView>
    );
  }

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchData() {
        try {
          const freshUser = await getProfile();
          if (!isActive) return;

          await updateUser(freshUser);
          setUser(freshUser);

          const [rankingData, numActivities, event] = await Promise.all([
            getUserRanking(freshUser.id),
            getUserActivitiesCount(freshUser.id),
            getCurrentEvent(),
          ]);

          if (!isActive) return;

          setRanking(rankingData.rank);
          setActivities(numActivities.totalActivities);

          // Status de inscrição no evento
          if (event?.id && freshUser?.id) {
            const registration = await getRegistrationByUserIdAndEventId(freshUser.id, event.id);
            if (!isActive) return;
            setIsUserSubscribed(!!registration);
            setRegistrationId(registration?.id || null);
          } else {
            setIsUserSubscribed(false);
            setRegistrationId(null);
          }
        } catch (error) {
          console.error("Erro ao buscar dados do perfil:", error);
          if (isActive) {
            setIsUserSubscribed(false);
            setRegistrationId(null);
          }
        }
      }

      fetchData();

      return () => {
        isActive = false;
        setConfirmAction(false);
        setErrorModalVisible(false);
      };
    }, [updateUser])
  );

  const unsubscribe = async () => {
    if (isParticipantView) return;
    try {
      if (!registrationId) return;
      await deleteRegistration(registrationId);
      setIsUserSubscribed(false);
      setRegistrationId(null);
    } catch {
      setErrorModalVisible(true);
    }
  };

  const nomeCompleto = new BeautifulName(userFromContext.nome || "").beautifulName;

  const pageHeader = (
    <>
      {Platform.OS === "web" && <ParticipantViewToggle />}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={Platform.OS === "android"} />

      <View className="flex-row justify-between items-center">
        <BackButton />

        <Text className="text-white text-xl font-poppinsSemiBold text-center mt-6">Perfil</Text>

        <EditButton disabled={isParticipantView} />
      </View>

      <View className="items-center mb-8">
        <View className="w-32 h-32 rounded-full border-[1px] border-[#3DCC87] bg-[#21353A] flex items-center justify-center mb-4">
          <View className="w-6 h-full flex items-center justify-center">
            <FontAwesomeIcon icon={faUser} size={48} color="#3DCC87" />
          </View>
        </View>

        <Text className="text-white text-2xl font-poppinsSemiBold mb-1">{nomeCompleto}</Text>

        <Text className="text-gray-400 font-poppins">{user.email}</Text>
      </View>

      {/* Stats */}
      <View className="relative flex-row justify-around items-center mb-8 px-5 py-7 border border-blue-100/30 rounded-lg">
        <Text className="absolute top-0 left-3 mt-[-8] px-1 bg-blue-900 text-gray-400 text-sm font-inter uppercase"> Estatísticas </Text>

        <View className="items-center">
          <Text className="text-white text-4xl font-poppinsSemiBold">{ranking ?? "-"}</Text>
          <Text className="text-gray-500 font-inter text-xs uppercase">No rank</Text>
        </View>

        <View className="items-center">
          <Text className="text-white text-4xl font-poppinsSemiBold">{user.points}</Text>
          <Text className="text-gray-500 font-inter text-xs uppercase">Pontos</Text>
        </View>

        <View className="items-center">
          <Text className="text-white text-4xl font-poppinsSemiBold">{activities ?? 0}</Text>
          <Text className="text-gray-500 font-inter text-xs uppercase">Atividades</Text>
        </View>
      </View>
    </>
  );
  return (
    <SafeAreaView className="bg-blue-900 flex-1 items-center">
      <View className="w-full px-6 max-w-[1000px] mx-auto flex-1">
        {Platform.OS !== "web" && pageHeader}

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 w-full"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {Platform.OS === "web" && pageHeader}
          <ProfileButton
            icon={faCalendarDays}
            label="Minhas Atividades"
            onPress={() => { navigation.navigate("MyEvents"); }}
          />

          <ProfileButton
            icon={faBell}
            label="Notificações"
            onPress={() => { navigation.navigate("Notifications"); }}
          />

          <ProfileButton
            icon={faQrcode}
            label="Credencial"
            onPress={() => { navigation.navigate("Credential"); }}
          />

          {/* Sair */}
          <Pressable onPress={signOut}>
            {({ pressed }) => (
              <View
                className={`flex-row h-[58px] items-center justify-between rounded-lg p-4 border border-iconbg transition-all duration-100
                  ${ pressed ? "bg-background/30" : "" }
                  ${ isUserSubscribed ? "mb-8" : "mb-24" }
                `}
              >
                <View className="flex-row items-center gap-4">
                  <View className="w-6 flex items-center justify-center">
                    <FontAwesomeIcon icon={faArrowRightFromBracket} size={20} color={colors.blue[200]}  />
                  </View>

                  <Text className="text-white text-base font-inter">Sair</Text>
                </View>
              </View>
            )}
          </Pressable>

          {isUserSubscribed &&
            <View className="w-full flex flex-col gap-4 mb-24">
              <Text className="text-sm text-[#F8F8F8] font-poppinsMedium">Inscrição no evento</Text>

              <Pressable disabled={isParticipantView} accessibilityState={{ disabled: isParticipantView }} style={{ opacity: isParticipantView ? 0.5 : 1 }} onPress={() => { if (!isParticipantView) setConfirmAction(true); }}>
                {({ pressed }) => (
                  <View
                    className={`flex-row h-[58px] items-center justify-between rounded-lg p-4 border border-danger/50 transition-all duration-100 ${
                      pressed ? "bg-[#ff99a3]/10" : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-6 flex items-center justify-center">
                        <FontAwesomeIcon icon={faCalendarXmark} size={20} color={colors.danger} />
                      </View>

                      <Text className="text-danger text-base font-inter">Cancelar inscrição</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            </View>
          }
        </ScrollView>
      </View>

      <ConfirmationOverlay
        visible={confirmAction}
        title={"Cancelar inscrição"}
        message={"Tem certeza que deseja remover sua inscrição do evento?"}
        onCancel={() => setConfirmAction(false)}
        onConfirm={async () => {
          await unsubscribe();
          setConfirmAction(false);
        }}
        confirmText="Confirmar"
        confirmButtonColor="#ff3247ff"
      />

      <ErrorOverlay
        visible={errorModalVisible}
        title="Erro ao cancelar inscrição"
        message="Tente novamente ou entre em contato com nossa equipe!"
        onConfirm={() => {setErrorModalVisible(false)}}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}
