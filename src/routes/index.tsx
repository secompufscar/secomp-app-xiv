import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/AuthContext";
import StackRoutes from "./stack.routes";
import AuthRoutes from "./auth.routes";

const linking = {
  prefixes: ["https://secomp-app-xiv.vercel.app", "secompapp://"],  
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
  const { user, isParticipantView } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const previousView = useRef(isParticipantView);

  useEffect(() => {
    if (previousView.current === isParticipantView) return;
    previousView.current = isParticipantView;
    if (user && navigationRef.isReady()) {
      navigationRef.resetRoot({ index: 0, routes: [{ name: "App" }] });
    }
  }, [isParticipantView, user, navigationRef]);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      {user ? <StackRoutes /> : <AuthRoutes />}
    </NavigationContainer>
  );
}
