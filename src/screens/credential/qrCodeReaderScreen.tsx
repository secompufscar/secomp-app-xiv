import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, AppState, Platform, ScrollView } from "react-native";
import { ParamListBase, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { checkIn } from "../../services/checkIn";
import { getActivityId } from "../../services/activities";
import ErrorOverlay from "../../components/overlay/errorOverlay";
import SuccessOverlay from "../../components/overlay/successOverlay";
import WarningOverlay from "../../components/overlay/warningOverlay";

let QrReader: any = null;
if (typeof window !== "undefined") {
  QrReader = require("@cmdnio/react-qr-reader").QrReader;
}

export default function QRCode() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const route = useRoute();
  const { id: activityId } = route.params as { id: string };
  const qrLock = useRef(false);
  const appState = useRef(AppState.currentState);
  
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [warningModalVisible, setWarningModalVisible] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // Evita múltiplos scans consecutivos usando qrLock, que pode ser resetado
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive | background/) && nextAppState === "active") {
        qrLock.current = false;
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (data && !qrLock.current) {
      qrLock.current = true;

      try {
        const userId = data;
        const activity: Activity | undefined = await getActivityId(activityId as string);

        if (!activity) {
          setWarningModalVisible(true);
          return;
        }

        if (userId && activityId) {
          await checkIn(userId, activityId);
          setSuccessModalVisible(true);
        } else {
          setErrorMessage("Dados inválidos para check-in.");
          setErrorModalVisible(true);
        }
      } catch (error) {
        const err = error as any;
        const errorMsg = err.response?.data?.message || "Falha ao processar o check-in.";
        setErrorMessage(errorMsg);
        setErrorModalVisible(true);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1" style={StyleSheet.absoluteFillObject}>
      {Platform.OS === "web" ? (
        <ScrollView contentContainerStyle={styles.webContainer}>
          <ParticipantViewToggle />
          <Text style={styles.webText}>Escaneie o QR Code</Text>
          <QrReader
            constraints={{ facingMode: "environment" }}
            onResult={(result: any) => {
              if (result?.text) {
                handleBarCodeScanned({ data: result.text });
              }
            }}
            containerStyle={{ width: "100%" }}
            videoContainerStyle={{ width: "100%" }}
          />
        </ScrollView>
      ) : (
        <CameraView style={StyleSheet.absoluteFillObject} facing="back" onBarcodeScanned={handleBarCodeScanned}>
          <View style={styles.overlay}>
            <View style={styles.square} />
          </View>
        </CameraView>
      )}

      <ErrorOverlay
        visible={errorModalVisible}
        title="Erro ao ler presença"
        message={errorMessage}
        onConfirm={() => {setErrorModalVisible(false); qrLock.current = false; navigation.goBack()}}
        confirmText="OK"
      />
      
      <SuccessOverlay
        visible={successModalVisible}
        title="Sucesso ao ler presença"
        message="Check-in realizado com sucesso."
        onConfirm={() => {setSuccessModalVisible(false); qrLock.current = false;}}
        confirmText="OK"
      />

      <WarningOverlay
        visible={warningModalVisible}
        title="Aviso"
        message="Atividade não encontrada!"
        onConfirm={() => {setWarningModalVisible(false); qrLock.current = false;}}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  square: {
    width: 300,
    height: 300,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 30,
    backgroundColor: "transparent",
  },

  webContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  webText: {
    fontSize: 18,
    marginBottom: 12,
  },
});
