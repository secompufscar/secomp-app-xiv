import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { Home, Schedule, UserProfile, AdminProfile, Activities } from "../screens";
import { colors } from "../styles/colors";
import { useAuth } from "../hooks/AuthContext";

const Tab = createBottomTabNavigator();

export default function TabRoutes() {
  const { canUseAdminTools } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "white",
        tabBarStyle: {
          backgroundColor: "#1C212C",
          borderTopWidth: 1,
          borderTopColor: "#212735",
          height: 72,
          maxWidth: 1000,
          width: "100%",
          position: "absolute",
          bottom: 0,
          marginHorizontal: "auto",
          paddingHorizontal: 12,
          paddingVertical: 5,
          gap: 4,
        },
        tabBarShowLabel: false,
        title: "SECOMP UFSCar",
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused }) => (
            <View className="flex justify-center items-center gap-[4px]">
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={20}
                color={focused ? colors.white : "#828EAD"}
              />
              <Text
                className={`text-[10px] font-inter font-medium ${focused ? "text-white" : "text-[#828EAD]"}`}
              >
                Início
              </Text>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Cronograma"
        component={Schedule}
        options={{
          tabBarIcon: ({ focused }) => (
            <View className="flex justify-center items-center gap-[4px]">
              <Ionicons
                name={focused ? "calendar-clear" : "calendar-clear-outline"}
                size={20}
                color={focused ? colors.white : "#828ead"}
              />
              <Text
                className={`text-[10px] font-inter font-medium ${focused ? "text-white" : "text-[#828EAD]"}`}
              >
                Cronograma
              </Text>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Activities"
        component={Activities}
        options={{
          tabBarIcon: ({ focused }) => (
            <View className="flex justify-center items-center gap-[4px]">
              <Ionicons
                name={focused ? "list" : "list-outline"}
                size={20}
                color={focused ? colors.white : "#828ead"}
              />
              <Text
                className={`text-[10px] font-inter font-medium ${focused ? "text-white" : "text-[#828EAD]"}`}
              >
                Atividades
              </Text>
            </View>
          ),
        }}
      />

      {canUseAdminTools ? (
        // Admin
        <Tab.Screen
          name="AdminPerfil"
          component={AdminProfile}
          options={{
            tabBarIcon: ({ focused }) => (
              <View className="flex justify-center items-center gap-[4px]">
                <Ionicons
                  name={focused ? "shield-half" : "shield-half-outline"}
                  size={20}
                  color={focused ? colors.white : "#828ead"}
                />
                <Text
                  className={`text-[10px] font-inter font-medium ${focused ? "text-white" : "text-[#828EAD]"}`}
                >
                  Admin
                </Text>
              </View>
            ),
          }}
        />
      ) : (
        // Usuário Padrão
        <Tab.Screen
          name="Perfil"
          component={UserProfile}
          options={{
            tabBarIcon: ({ focused }) => (
              <View className="flex justify-center items-center gap-[4px]">
                <Ionicons
                  name={focused ? "person" : "person-outline"}
                  size={20}
                  color={focused ? colors.white : "#828ead"}
                />
                <Text
                  className={`text-[10px] font-inter font-medium ${focused ? "text-white" : "text-[#828EAD]"}`}
                >
                  Perfil
                </Text>
              </View>
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}
