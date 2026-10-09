import ParticipantViewToggle from "../../components/app/participantViewToggle";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../hooks/AuthContext";
import { CredentialingFilter, DirectoryParticipant, ParticipantDirectory, formatCredentialingDate, getParticipantDirectory } from "../../services/participantDirectory";
import CredentialingConfirmationDialog from "../../components/overlay/credentialingConfirmationDialog";
import { matchesParticipantName } from "../../components/overlay/credentialingRemovalDialog";
import { checkIn } from "../../services/checkIn";
import { CredentialingError, getCurrentCredentialingActivity } from "../../services/credentialing";
import UserAttendanceDialog from "../../components/overlay/userAttendanceDialog";
import BackButton from "../../components/button/backButton";
import { colors } from "../../styles/colors";

const buttonStyle = { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, justifyContent: "center" as const, alignItems: "center" as const };

export default function ParticipantDirectoryScreen() {
  const { canUseAdminTools } = useAuth();
  const allowed = Platform.OS === "web" && canUseAdminTools;
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CredentialingFilter>("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ParticipantDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DirectoryParticipant | null>(null);
  const [credentialingSelected, setCredentialingSelected] = useState<{ person: DirectoryParticipant; activityId: string; eventId: string } | null>(null);
  const [typedName, setTypedName] = useState("");
  const [credentialing, setCredentialing] = useState(false);
  const [credentialingError, setCredentialingError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const generation = useRef(0);
  const focused = useRef(false);
  const focusGeneration = useRef(0);
  const inFlight = useRef(false);

  const fetchData = useCallback(async (failureMessage?: string) => {
    if (!allowed) return;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const data = await getParticipantDirectory(page, query, filter);
      if (request === generation.current) setResult(data);
    } catch (failure: any) {
      if (request === generation.current) setError(failureMessage || failure.response?.data?.message || "Não foi possível carregar os participantes. Tente novamente.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [allowed, page, query, filter]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    focusGeneration.current++;
    void fetchData();
    return () => {
      focused.current = false;
      focusGeneration.current++;
      generation.current++;
      setSelected(null);
      setCredentialingSelected(null);
      setTypedName("");
      setCredentialingError(null);
      setSuccess(null);
    };
  }, [fetchData]));

  const credentialParticipant = async () => {
    const target = credentialingSelected;
    if (!allowed || !target || target.person.credentialed || !matchesParticipantName(typedName, target.person.nome) || inFlight.current || !focused.current) return;
    const requestFocus = focusGeneration.current;
    inFlight.current = true;
    setCredentialing(true);
    setCredentialingError(null);
    try {
      const activity = await getCurrentCredentialingActivity();
      if (!focused.current || requestFocus !== focusGeneration.current) return;
      if (activity.id !== target.activityId || activity.eventId !== target.eventId) {
        setCredentialingError("A edição ou o credenciamento mudou. Cancele e atualize a lista antes de confirmar.");
        return;
      }
      await checkIn(target.person.id, target.activityId);
      if (!focused.current || requestFocus !== focusGeneration.current) return;
      setCredentialingSelected(null);
      setTypedName("");
      setSuccess(`Credenciamento de ${target.person.nome} realizado.`);
      await fetchData("Credenciamento realizado, mas não foi possível atualizar a lista. Tente novamente para consultar o resultado.");
    } catch (failure: any) {
      if (focused.current && requestFocus === focusGeneration.current) {
        setCredentialingError(failure.response?.data?.message || (failure instanceof CredentialingError ? failure.message : "Não foi possível confirmar o credenciamento. Atualize a lista antes de tentar novamente."));
      }
    } finally {
      inFlight.current = false;
      setCredentialing(false);
    }
  };

  if (!allowed) return null;
  const submitSearch = () => {
    if (inFlight.current) return;
    setSuccess(null);
    const next = input.trim();
    if (page === 1 && query === next) void fetchData();
    else { setPage(1); setQuery(next); }
  };
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <SafeAreaView className="flex-1 bg-blue-900 items-center">
      <ScrollView style={{ flex: 1, width: "100%", maxWidth: 1000 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <ParticipantViewToggle />
        <BackButton />
        <Text accessibilityRole="header" style={{ color: colors.white, fontFamily: "Poppins_600SemiBold", fontSize: 24, marginBottom: 8 }}>Todos os participantes</Text>
        <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 16 }}>Todas as contas cadastradas. Credenciamento da edição {result?.event.year ?? "atual"}.</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <TextInput accessibilityLabel="Buscar participante por nome ou e-mail" placeholder="Nome ou e-mail" placeholderTextColor={colors.border} value={input} maxLength={120} onChangeText={setInput} onSubmitEditing={submitSearch} autoCapitalize="none" style={{ flex: 1, minWidth: 0, minHeight: 48, color: colors.white, fontFamily: "Inter_400Regular", padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Buscar participantes" onPress={submitSearch} style={buttonStyle}><Text style={{ color: colors.white }}>Buscar</Text></Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {([["all", "Todos"], ["yes", "Credenciados"], ["no", "Não credenciados"]] as const).map(([value, label]) => (
            <Pressable key={value} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: filter === value }} onPress={() => { setPage(1); setFilter(value); }} style={{ ...buttonStyle, backgroundColor: filter === value ? colors.iconbg : undefined }}>
              <Text style={{ color: colors.white, fontFamily: "Inter_500Medium" }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {success && <Text accessibilityLiveRegion="polite" style={{ color: colors.success, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 12 }}>{success}</Text>}
        {loading ? <ActivityIndicator accessibilityLabel="Carregando todos os participantes" color={colors.white} style={{ marginVertical: 24 }} /> : error ? (
          <View style={{ gap: 12 }}>
            <Text accessibilityRole="alert" style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar participantes novamente" onPress={() => void fetchData()} style={buttonStyle}><Text style={{ color: colors.white }}>Tentar novamente</Text></Pressable>
          </View>
        ) : result && (
          <>
            <Text accessibilityLiveRegion="polite" style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 12 }}>{result.credentialedCount} credenciados · {result.notCredentialedCount} não credenciados</Text>
            {result.users.length === 0 && <Text style={{ color: colors.default, lineHeight: 22 }}>Nenhum participante encontrado.</Text>}
            {result.users.map(item => (
                <View key={item.id} style={{ padding: 16, gap: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
                  <Text style={{ color: colors.white, fontFamily: "Inter_500Medium", lineHeight: 22 }}>{item.nome}</Text>
                  <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22, flexShrink: 1 }}>{item.email}</Text>
                  <View accessibilityLabel={`${item.nome}: ${item.credentialed ? "Credenciado" : "Não credenciado"}`} style={{ alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: item.credentialed ? colors.success : colors.danger, backgroundColor: item.credentialed ? "#0FB84220" : "#F05D6C20" }}>
                    <Text style={{ color: item.credentialed ? colors.success : colors.danger, fontFamily: "Inter_500Medium" }}>{item.credentialed ? "Credenciado" : "Não credenciado"}</Text>
                  </View>
                  {item.credentialed && <Text style={{ color: colors.default, fontFamily: "Inter_400Regular", lineHeight: 22 }}>{item.credentialedAt ? `Credenciamento: ${formatCredentialingDate(item.credentialedAt)}` : "Data do credenciamento não disponível"}</Text>}
                  {!item.credentialed && <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Credenciar ${item.nome}`}
                    disabled={credentialing}
                    accessibilityState={{ disabled: credentialing }}
                    onPress={() => {
                      if (inFlight.current) return;
                      setSelected(null);
                      setCredentialingSelected({ person: item, activityId: result.activityId, eventId: result.event.id });
                      setTypedName("");
                      setCredentialingError(null);
                      setSuccess(null);
                    }}
                    style={{ ...buttonStyle, backgroundColor: colors.blue[500], borderColor: colors.blue[500], opacity: credentialing ? 0.5 : 1 }}
                  ><Text style={{ color: colors.white, textAlign: "center", fontFamily: "Inter_500Medium" }}>Credenciar</Text></Pressable>}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Ver atividades com presença de ${item.nome}`} onPress={() => setSelected(item)} style={buttonStyle}><Text style={{ color: colors.white, textAlign: "center", fontFamily: "Inter_500Medium" }}>Ver atividades com presença</Text></Pressable>
                </View>
              ))}
            <View style={{ gap: 8, paddingVertical: 12 }}>
              <Text style={{ color: colors.default, textAlign: "center" }}>Página {result.page} de {pages} · {result.total} participantes</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Página anterior" disabled={result.page <= 1} onPress={() => setPage(result.page - 1)} style={{ ...buttonStyle, flex: 1, opacity: result.page <= 1 ? 0.5 : 1 }}><Text style={{ color: colors.white }}>Anterior</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Próxima página" disabled={result.page >= pages} onPress={() => setPage(result.page + 1)} style={{ ...buttonStyle, flex: 1, opacity: result.page >= pages ? 0.5 : 1 }}><Text style={{ color: colors.white }}>Próxima</Text></Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      {credentialingSelected && <CredentialingConfirmationDialog
        key={credentialingSelected.person.id}
        name={credentialingSelected.person.nome}
        typedName={typedName}
        onChangeName={setTypedName}
        busy={credentialing}
        error={credentialingError}
        onCancel={() => {
          if (inFlight.current) return;
          setCredentialingSelected(null);
          setTypedName("");
          setCredentialingError(null);
        }}
        onConfirm={credentialParticipant}
      />}
      {selected && <UserAttendanceDialog key={selected.id} userId={selected.id} name={selected.nome} onClose={() => setSelected(null)} />}
    </SafeAreaView>
  );
}
