import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../hooks/AuthContext";
import StackRoutes from "./stack.routes";
import AuthRoutes from "./auth.routes";

const linking = {
  prefixes: ["https://app.secompufscar.com.br", "secompapp://"],
  config: {
    screens: {
      SetNewPassword: {
        path: "SetNewPassword",
        parse: {
          token: (token: string) => token,
        },
      },
    },
  },
};

export default function Routes() {
  const { user } = useAuth();

  return (
    <NavigationContainer linking={linking}>
      {user ? <StackRoutes /> : <AuthRoutes />}
    </NavigationContainer>
  );
}
