import "react-native-reanimated";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "./hooks/AuthContext";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { colors } from "./styles/colors";
import Routes from "./routes";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import * as SplashScreen from "expo-splash-screen";
import "./styles/global.css";
import "@expo/metro-runtime";
import { AppVersionProvider, useAppVersion } from "./hooks/AppVersionContext";
import UpdateRequiredScreen from "./screens/update/updateRequiredScreen";

SplashScreen.preventAutoHideAsync();

NavigationBar.setPositionAsync("absolute");
NavigationBar.setBackgroundColorAsync("#ffffff00");
NavigationBar.setButtonStyleAsync("light");
SystemUI.setBackgroundColorAsync("transparent");

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppVersionProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppVersionProvider>
  );
}

function AppContent() {
  const { loading } = useAuth();
  const { checkingVersion, requiredUpdate } = useAppVersion();

  if (requiredUpdate) return <UpdateRequiredScreen policy={requiredUpdate} />;

  if (loading || checkingVersion) {
    return ( 
      <View className="flex-1 justify-center items-center bg-blue-900"> 
        <ActivityIndicator size="large" color={colors.blue[500]} /> 
      </View> 
    );
  }

  return <Routes />;
}
