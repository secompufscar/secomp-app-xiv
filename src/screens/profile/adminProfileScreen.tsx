import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, StatusBar, Platform, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ParamListBase, useFocusEffect, useNavigation } from "@react-navigation/native";
import { BeautifulName } from "beautiful-name";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faBell, faArrowRightFromBracket, faQrcode, faFlag, faUser, faStar, faTags, faTicket, faCalendarXmark, faListOl } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../hooks/AuthContext";
import { getProfile } from "../../services/users";
import { deleteRegistration, getRegistrationByUserIdAndEventId } from "../../services/userEvents";
import { getCurrentEvent } from "../../services/events";
import { CredentialingError, getCurrentCredentialingActivity } from "../../services/credentialing";
import { colors } from "../../styles/colors";
import BackButton from "../../components/button/backButton";
import EditButton from "../../components/button/editButton";
import ProfileButton from "../../components/button/profileButton";
import ConfirmationOverlay from "../../components/overlay/confirmationOverlay";
import ErrorOverlay from "../../components/overlay/errorOverlay";

export default function AdminProfile() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { signOut, user: userFromContext, updateUser, canUseAdminTools } = useAuth();

  const [user, setUser] = useState(userFromContext);
  const nomeCompleto = new BeautifulName(user?.nome || "").beautifulName;

  const [isUserSubscribed, setIsUserSubscribed] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [credentialingLoading, setCredentialingLoading] = useState(false);
  const [credentialingError, setCredentialingError] = useState<string | null>(null);
  const credentialingGeneration = useRef(0);
  const credentialingInFlight = useRef(false);

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

          const event = await getCurrentEvent();

          if (!isActive) return;
          
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
        credentialingGeneration.current++;
        credentialingInFlight.current = false;
        setCredentialingLoading(false);
        setCredentialingError(null);
        setConfirmAction(false);
        setErrorModalVisible(false);
      };
    }, [updateUser])
  );

  const openCredentialing = async () => {
    if (!canUseAdminTools || credentialingInFlight.current) return;
    const generation = ++credentialingGeneration.current;
    credentialingInFlight.current = true;
    setCredentialingLoading(true);
    setCredentialingError(null);
    try {
      const activity = await getCurrentCredentialingActivity();
      if (generation === credentialingGeneration.current) navigation.navigate("QRCode", { id: activity.id });
    } catch (error) {
      if (generation === credentialingGeneration.current) {
        setCredentialingError(error instanceof CredentialingError ? error.message : "Não foi possível carregar o credenciamento. Tente novamente.");
      }
    } finally {
      if (generation === credentialingGeneration.current) {
        credentialingInFlight.current = false;
        setCredentialingLoading(false);
      }
    }
  };

  const unsubscribe = async () => {
    try {
      if (!registrationId) return;
      await deleteRegistration(registrationId);
      setIsUserSubscribed(false);
      setRegistrationId(null);
    } catch {
      setErrorModalVisible(true);
    }
  };

  return (
    <SafeAreaView className="bg-blue-900 flex-1 items-center">
      <View className="w-full px-6 max-w-[1000px] mx-auto flex-1">
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={Platform.OS === "android"}
        />
        
        <View className="flex-row justify-between items-center">
          {<BackButton />}

          <Text className="text-white text-xl font-poppinsSemiBold text-center">Perfil</Text>

          <EditButton />
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 w-full"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <ProfileButton
            icon={faQrcode}
            label={credentialingLoading ? "Carregando..." : "Credenciamento"}
            disabled={credentialingLoading}
            busy={credentialingLoading}
            onPress={openCredentialing}
          />

          <ProfileButton
            icon={faBell}
            label="Notificações"
            onPress={() => { navigation.navigate("AdminNotificationScreen") }}
          />

          <ProfileButton
            icon={faFlag}
            label="Atividades"
            onPress={() => { navigation.navigate("ActivityAdmin" )}}
          />

          <ProfileButton
            icon={faListOl}
            label="Listas para sorteio"
            onPress={() => { navigation.navigate("ActivityRaffleLists") }}
          />

          <ProfileButton
            icon={faStar}
            label="Patrocinadores"
            onPress={() => { navigation.navigate("SponsorsAdmin") }}
          />

          <ProfileButton
            icon={faTags}
            label="Tags"
            onPress={() => { navigation.navigate("TagsAdmin") }}
          />

          <ProfileButton
            icon={faTicket}
            label="Eventos"
            onPress={() => { navigation.navigate("EventAdmin") }}
          />

          {/* Sair */}
          <Pressable onPress={signOut}>
            {({ pressed }) => (
              <View
                className={`flex-row h-[58px] items-center justify-between rounded-lg p-5 mb-24 border border-iconbg transition-all duration-100
                  ${ pressed ? "bg-background/30" : "" }
                  ${ isUserSubscribed ? "mb-8" : "mb-24" }
                `}
              >
                <View className="flex-row items-center gap-4">
                  <View className="w-6 flex items-center justify-center">
                    <FontAwesomeIcon icon={faArrowRightFromBracket} size={20} color={colors.blue[200]} />
                  </View>

                  <Text className="text-white text-base font-inter">Sair</Text>
                </View>
              </View>
            )}
          </Pressable>

          {isUserSubscribed && 
            <View className="w-full flex flex-col gap-4">
              <Text className="text-sm text-[#F8F8F8] font-poppinsMedium">Inscrição no evento</Text>

              <Pressable onPress={() => {setConfirmAction(true)}}>
                {({ pressed }) => (
                  <View
                    className={`flex-row h-[58px] items-center justify-between rounded-lg p-4 mb-24 border border-danger/50 transition-all duration-100 ${
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
        visible={credentialingError !== null}
        title="Credenciamento indisponível"
        message={credentialingError ?? ""}
        onConfirm={() => setCredentialingError(null)}
        confirmText="OK"
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
