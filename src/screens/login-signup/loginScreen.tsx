import { Platform, View, Text, Pressable } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/AuthContext";
import { AuthTypes } from "../../routes/auth.routes";
import { colors } from "../../styles/colors";
import { login } from "../../services/users";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Input } from "../../components/input/input";
import Button from "../../components/button/button";
import AppLayout from "../../components/app/appLayout";
import BackButton from "../../components/button/backButton";
import validator from "validator";
import { registerForPushNotifications, setupNotificationListeners } from "../../services/notifications";

export default function Login() {
  const navigation = useNavigation<AuthTypes>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [isEmailValid, setIsEmailValid] = useState(true);

  const [senha, setSenha] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertText, setAlertText] = useState("");
  const [alertColor, setAlertColor] = useState("text-gray-400");

  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    return validator.isEmail(email);
  };

  // Limpar os campos ao sair da tela
  useFocusEffect(
    useCallback(() => {
      return () => {
        setEmail("");
        setSenha("");
        setIsEmailValid(true);
        setIsPasswordValid(true);
        setIsAlertOpen(false);
        setAlertText("");
      };
    }, [])
  );

  const handleLogin = async () => {
    setIsEmailValid(true);
    setIsPasswordValid(true);
    setIsAlertOpen(false);

    if (!email.trim() || !senha.trim()) {
      setAlertText("Por favor, preencha todos os campos");
      setAlertColor("text-warning");
      setIsAlertOpen(true);
      return;
    }

    // Verifica a validade do e-mail
    const emailValido = validateEmail(email);
    setIsEmailValid(emailValido);
    if (!emailValido) return;

    // Verifica a validade da senha
    if (senha.length < 6) {
      setIsPasswordValid(false);
      return;
    } else {
      setIsPasswordValid(true);
    }

    setIsLoading(true);

    try {
      const { user, token } = await login({ email, senha });
      await signIn(user, token);
      if (Platform.OS === "android" || Platform.OS === "ios") {
        try {
          await registerForPushNotifications();
          setupNotificationListeners(navigation);
        } catch (notificationError) {
          console.error("Erro ao configurar notificações:", notificationError);
        }
      }
    } catch (error) {
      const err = error as any;
      const errorMessage = err.response?.data?.message || "Falha ao processar o login.";

      setAlertText(errorMessage);
      setAlertColor("text-danger");
      setIsAlertOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-900 items-center">
      <AppLayout>
        <BackButton />

        <View className={`mt-8`}>
          <Text className="text-white text-[24px] font-poppinsSemiBold">Olá,</Text>

          <Text className="text-white text-[24px] font-poppinsSemiBold">Bem-vindo de volta</Text>
        </View>

        <View className="flex-col w-full gap-2 py-6 text-center justify-center">
          <View className="w-full">
            <Input>
              <MaterialIcons name="email" size={20} color={colors.border} />

              <Input.Field
                placeholder="E-mail"
                onChangeText={setEmail}
                value={email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Input>
          </View>

          <View className="w-full">
            <Input>
              <MaterialIcons name="lock" size={20} color={colors.border} />

              <Input.Field
                placeholder="Senha"
                onChangeText={setSenha}
                value={senha}
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
              />

              <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                <Ionicons
                  name={isPasswordVisible ? "eye" : "eye-off"}
                  size={20}
                  color={colors.border}
                />
              </Pressable>
            </Input>
          </View>

          <View
            className={`w-full flex flex-row items-center ${isAlertOpen || !isEmailValid || !isPasswordValid ? "justify-between" : "justify-end"}`}
          >
            {!isEmailValid && (
              <Text className="text-[12px] text-danger font-inter">
                Por favor, digite um email válido!
              </Text>
            )}

            {!isPasswordValid && (
              <Text className="text-[12px] text-danger font-inter">
                A senha deve conter no mínimo 6 caracteres
              </Text>
            )}

            {isAlertOpen && <Text className={`text-[12px] font-inter ${alertColor}`}>{alertText}</Text>}

            <Pressable onPress={() => navigation.navigate("PasswordReset")}>
              {({ pressed }) => (
                <Text
                  className={`text-[12px] font-interMedium ${pressed ? "text-gray-400" : "text-gray-400/80"}`}
                >
                  Esqueci minha senha
                </Text>
              )}
            </Pressable>
          </View>

          <Button className="mt-8" title="Entrar" loading={isLoading} onPress={handleLogin} />

          <View className="flex-row mt-8 items-center justify-center gap-1">
            <Text className="text-white text-[12px] font-inter">Não possui uma conta?</Text>

            <Pressable onPress={() => navigation.navigate("SignUp")}>
              {({ pressed }) => (
                <Text
                  className={`text-[12px] font-inter font-semibold ${pressed ? "text-blue-500 opacity-80" : "text-blue-500"}`}
                >
                  Criar agora
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </AppLayout>
    </SafeAreaView>
  );
}
