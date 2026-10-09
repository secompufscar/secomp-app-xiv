import { NativeStackNavigationProp, createNativeStackNavigator } from "@react-navigation/native-stack";
import { Login, SignUp, EmailConfirmation, PasswordReset, VerifyEmail, SetNewPassword, Welcome } from "../screens";

const Stack = createNativeStackNavigator();

// Rotas para usuários não logados
export type StackNavigation = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  EmailConfirmation: { email: string };
  PasswordReset: undefined;
  VerifyEmail: { email: string };
  SetNewPassword: undefined;
};

export type AuthTypes = NativeStackNavigationProp<StackNavigation>;

export default function AuthRoutes() {
  return (
    <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="EmailConfirmation" component={EmailConfirmation} />
      <Stack.Screen name="PasswordReset" component={PasswordReset} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
      <Stack.Screen name="SetNewPassword" component={SetNewPassword} />
    </Stack.Navigator>
  );
}
