import { useEffect, useState } from "react";
import { useRoute } from "@react-navigation/native";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/button/button";
import BackButton from "../../components/button/backButton";
import { getActivityId } from "../../services/activities";
import ActivityDetails from "./activityDetailsScreen";

export default function ActivityDetailsRoute() {
  const route = useRoute();
  const item = (route.params as { item?: Partial<Activity> } | undefined)?.item;
  const id = typeof item?.id === "string" ? item.id : undefined;
  const complete = item && typeof item.nome === "string" && typeof item.data === "string";
  const [result, setResult] = useState<{ id: string; activity?: Activity; error?: boolean }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (complete || !id) return;
    let active = true;
    setResult(undefined);
    getActivityId(id).then(activity => {
      if (activity.id !== id || !activity.nome || !activity.data) throw new Error("Invalid activity response");
      if (active) setResult({ id, activity });
    }).catch(() => { if (active) setResult({ id, error: true }); });
    return () => { active = false; };
  }, [id, complete, attempt]);

  if (complete) return <ActivityDetails activity={item as Activity} />;
  if (result?.id === id && result?.activity) return <ActivityDetails activity={result.activity} />;
  const failed = !id || (result?.id === id && result?.error);
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="w-full max-w-[1000px] mx-auto px-6">
        <BackButton />
        {failed ? <>
          <Text accessibilityRole="alert" className="text-white font-inter mb-6">Não foi possível carregar esta atividade.</Text>
          {id && <Button title="Tentar carregar atividade novamente" onPress={() => setAttempt(value => value + 1)} />}
        </> : <>
          <ActivityIndicator color="#FFFFFF" />
          <Text accessibilityLiveRegion="polite" className="text-white font-inter mt-4">Carregando atividade…</Text>
        </>}
      </View>
    </SafeAreaView>
  );
}
