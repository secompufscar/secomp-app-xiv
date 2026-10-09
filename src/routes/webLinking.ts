import { getStateFromPath, type LinkingOptions, type NavigatorScreenParams } from "@react-navigation/native";
import type { StackNavigation } from "./stack.routes";
import type { StackNavigation as AuthNavigation } from "./auth.routes";

export type WebRootParamList = Omit<StackNavigation, "App"> & AuthNavigation & {
  App: NavigatorScreenParams<{ Home: undefined; Cronograma: undefined; Activities: undefined; AdminPerfil: undefined; Perfil: undefined }>;
};

// Keep URLs limited to identifiers; full records are loaded by the destination.
const recordParameter = {
  parse: { item: (id: string) => ({ id }) },
  stringify: { item: (item: { id: string }) => item.id },
};

export function createWebLinking(authenticated: boolean, admin: boolean, participantView: boolean): LinkingOptions<WebRootParamList> {
  const screens: NonNullable<NonNullable<LinkingOptions<WebRootParamList>["config"]>["screens"]> = authenticated ? {
    App: {
      path: "App",
      initialRouteName: "Home",
      screens: {
        Home: "Home",
        Cronograma: "Cronograma",
        Activities: "Activities",
        ...(admin ? { AdminPerfil: "AdminPerfil" } : { Perfil: "Perfil" }),
      },
    },
    Schedule: "Schedule",
    EventGuide: "EventGuide",
    Sponsors: "Sponsors",
    MyEvents: "MyEvents",
    Ranking: "Ranking",
    Credential: "Credential",
    Activities: "Activities",
    ...(!participantView ? { EditProfile: "EditProfile" } : {}),
    ActivityDetails: { path: "ActivityDetails", ...recordParameter },
    EventConfirmation: {
      path: "EventConfirmation",
      parse: { event: (id: string) => ({ id }) },
      stringify: { event: (event: { id: string }) => event.id },
    },
    Notifications: "Notifications",
    ...(admin ? {
      QRCode: "QRCode",
      ParticipantsList: "ParticipantsList",
      ParticipantDirectory: "ParticipantDirectory",
      ActivityRaffleLists: "ActivityRaffleLists",
      ActivityAdmin: "ActivityAdmin",
      ActivityAdminCreate: "ActivityAdminCreate",
      ActivityAdminUpdate: "ActivityAdminUpdate",
      EventAdmin: "EventAdmin",
      EventAdminCreate: "EventAdminCreate",
      EventAdminUpdate: "EventAdminUpdate",
      SponsorsAdmin: "SponsorsAdmin",
      SponsorsAdminCreate: "SponsorsAdminCreate",
      SponsorsAdminUpdate: "SponsorsAdminUpdate",
      TagsAdmin: "TagsAdmin",
      AdminNotificationScreen: "AdminNotificationScreen",
      AdminNotificationSend: "AdminNotificationSend",
    } : {}),
  } : {
    Welcome: "Welcome",
    SignUp: "SignUp",
    Login: "Login",
    EmailConfirmation: "EmailConfirmation",
    PasswordReset: "PasswordReset",
    VerifyEmail: "VerifyEmail",
    SetNewPassword: "SetNewPassword",
  };
  return {
    prefixes: ["https://secomp-app-xiv.vercel.app"],
    config: { initialRouteName: authenticated ? "App" : "Welcome", screens },
    getStateFromPath(path, options) {
      const state = getStateFromPath(path, options);
      let route = state?.routes[state.routes.length - 1];
      while (route?.state) route = route.state.routes[route.state.routes.length - 1];
      const params = route?.params as Record<string, unknown> | undefined;
      const required = route?.name === "ActivityDetails" ? (params?.item as { id?: string } | undefined)?.id
        : route?.name === "ParticipantsList" ? params?.activityId
        : ["QRCode", "ActivityAdminUpdate", "EventAdminUpdate", "SponsorsAdminUpdate"].includes(route?.name ?? "") ? params?.id
        : true;
      if (!required || required === "[object Object]") return undefined;
      return state;
    },
  };
}
