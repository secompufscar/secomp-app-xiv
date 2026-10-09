import { NativeStackNavigationProp, createNativeStackNavigator } from "@react-navigation/native-stack";
import TabRoutes from "./tab.routes";
import { Platform } from "react-native";
import { useAuth } from "../hooks/AuthContext";

import {
  Schedule,
  EventGuide,
  Sponsors,
  MyEvents,
  Ranking,
  Credential,
  Activities,
  QRCode,
  EditProfile,
  ActivityDetails,
  ParticipantsList,
  ParticipantDirectory,
  ActivityRaffleLists,
  ActivityAdmin,
  ActivityAdminCreate,
  ActivityAdminUpdate,
  EventAdmin,
  EventAdminCreate,
  EventAdminUpdate,
  EventConfirmation,
  SponsorsAdmin,
  SponsorsAdminCreate,
  SponsorsAdminUpdate,
  TagsAdmin,
  Notifications,
  AdminNotificationScreen,
  AdminNotificationSend,
} from '../screens'

const Stack = createNativeStackNavigator();

// Rotas para usuários logados
export type StackNavigation = {
  App: undefined;
  Schedule: undefined;
  EventGuide: undefined;
  Sponsors: undefined;
  MyEvents: undefined;
  Ranking: undefined;
  Credential: undefined;
  Activities: undefined;
  QRCode: { id: string };
  EditProfile: undefined;
  ActivityDetails: { item: Activity };
  ParticipantsList: { activityId: string; activityName: string; };
  ParticipantDirectory: undefined;
  ActivityRaffleLists: undefined;
  ActivityAdmin: undefined;
  ActivityAdminCreate: undefined;
  ActivityAdminUpdate: { id: string };
  EventAdmin: undefined;
  EventAdminCreate: undefined;
  EventAdminUpdate: { id: string };
  EventConfirmation: { event: Events};
  SponsorsAdmin: undefined;
  SponsorsAdminCreate: undefined;
  SponsorsAdminUpdate: { id: string };
  TagsAdmin: undefined;
  Notifications: undefined;
  AdminNotificationScreen: undefined;
  AdminNotificationSend: undefined;
};

export type StackTypes = NativeStackNavigationProp<StackNavigation>;

export default function StackRoutes() {
  const { canUseAdminTools, isParticipantView } = useAuth();
  return (
    <Stack.Navigator
        screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="App" component={TabRoutes} />
      <Stack.Screen name="Schedule" component={Schedule} />
      <Stack.Screen name="EventGuide" component={EventGuide} />
      <Stack.Screen name="Sponsors" component={Sponsors} />
      <Stack.Screen name="MyEvents" component={MyEvents} />
      <Stack.Screen name="Ranking" component={Ranking} />
      <Stack.Screen name="Credential" component={Credential} />
      <Stack.Screen name="Activities" component={Activities} />
      {!isParticipantView && <Stack.Screen name="EditProfile" component={EditProfile} />}
      <Stack.Screen name="ActivityDetails" component={ActivityDetails} />
      <Stack.Screen name="EventConfirmation" component={EventConfirmation} />
      {canUseAdminTools && (
        <Stack.Group>
          <Stack.Screen name="QRCode" component={QRCode} />
          <Stack.Screen name="ParticipantsList" component={ParticipantsList} />
          {Platform.OS === "web" && <Stack.Screen name="ParticipantDirectory" component={ParticipantDirectory} />}
          <Stack.Screen name="ActivityRaffleLists" component={ActivityRaffleLists} />
          <Stack.Screen name="ActivityAdmin" component={ActivityAdmin} />
          <Stack.Screen name="ActivityAdminCreate" component={ActivityAdminCreate} />
          <Stack.Screen name="ActivityAdminUpdate" component={ActivityAdminUpdate} />
          <Stack.Screen name="EventAdmin" component={EventAdmin} />
          <Stack.Screen name="EventAdminCreate" component={EventAdminCreate} />
          <Stack.Screen name="EventAdminUpdate" component={EventAdminUpdate} />
          <Stack.Screen name="SponsorsAdmin" component={SponsorsAdmin} />
          <Stack.Screen name="SponsorsAdminCreate" component={SponsorsAdminCreate} />
          <Stack.Screen name="SponsorsAdminUpdate" component={SponsorsAdminUpdate} />
          <Stack.Screen name="TagsAdmin" component={TagsAdmin} />
          <Stack.Screen name="AdminNotificationScreen" component={AdminNotificationScreen} />
          <Stack.Screen name="AdminNotificationSend" component={AdminNotificationSend} />
        </Stack.Group>
      )}
      <Stack.Screen name="Notifications" component={Notifications} />
    </Stack.Navigator>
  );
}
