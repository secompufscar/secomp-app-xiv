import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useAuth } from "../../hooks/AuthContext";
import { AttendedActivity, formatActivityDate, getUserAttendedActivities } from "../../services/userAttendance";
import { colors } from "../../styles/colors";

interface Props {
  userId: string;
  name: string;
  onClose: () => void;
}

export default function UserAttendanceDialog({ userId, name, onClose }: Props) {
  const { canUseAdminTools } = useAuth();
  const allowed = Platform.OS === "web" && canUseAdminTools;
  const { height, width } = useWindowDimensions();
  const [activities, setActivities] = useState<AttendedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    setError(false);
    setActivities([]);
    void getUserAttendedActivities(userId).then(result => {
      if (active) setActivities(result);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [userId, allowed, attempt]);

  if (!allowed) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 16, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: 640, maxHeight: Math.max(160, height - 32), padding: width < 400 ? 16 : 24, gap: 20, borderRadius: 12, backgroundColor: colors.blue[900] }}>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 12 }}>
            <Text accessibilityRole="header" style={{ color: colors.white, fontFamily: "Poppins_600SemiBold", fontSize: 18 }}>Atividades com presença</Text>
            <Text style={{ color: colors.white, fontFamily: "Inter_500Medium", lineHeight: 22 }}>{name}</Text>
            <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22 }}>Presenças registradas em todas as edições, da mais recente à mais antiga.</Text>
            {loading ? (
              <ActivityIndicator accessibilityLabel="Carregando presenças" color={colors.white} style={{ marginVertical: 24 }} />
            ) : error ? (
              <View style={{ gap: 12 }}>
                <Text accessibilityRole="alert" style={{ color: colors.danger, fontFamily: "Inter_400Regular", lineHeight: 22 }}>Não foi possível carregar as presenças deste usuário.</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar presenças novamente" onPress={() => setAttempt(previous => previous + 1)} style={{ minHeight: 48, justifyContent: "center", alignItems: "center", padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
                  <Text style={{ color: colors.white, fontFamily: "Inter_500Medium", textAlign: "center" }}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text accessibilityLiveRegion="polite" style={{ color: colors.default, fontFamily: "Inter_500Medium" }}>{activities.length} {activities.length === 1 ? "atividade com presença registrada" : "atividades com presença registrada"}</Text>
                {activities.length === 0 && <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22 }}>Nenhuma presença registrada para este usuário.</Text>}
                {activities.map(activity => (
                  <View key={activity.id} style={{ padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
                    <Text style={{ color: colors.white, fontFamily: "Inter_500Medium", lineHeight: 22 }}>{activity.nome}</Text>
                    <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22 }}>Horário da atividade: {formatActivityDate(activity.data)}</Text>
                    <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22 }}>Local: {activity.local || "Não informado"}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar atividades com presença" onPress={onClose} style={{ minHeight: 48, flexShrink: 0, alignItems: "center", justifyContent: "center", padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
            <Text style={{ color: colors.white, fontFamily: "Inter_500Medium" }}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
