import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Download, Search } from "lucide-react-native";
import { CertificateData, certificateActivityDate, certificateError, certificateWorkload, validateCertificate } from "../../services/certificates";
import { downloadCertificate } from "../../services/certificateDownload";

export default function CertificateValidationScreen() {
  const initialCode = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("codigo") || "";
  const [code, setCode] = useState(initialCode);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(false), [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);

  async function search(value: string) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); setCertificate(null);
    const normalized = value.trim().toUpperCase();
    try {
      const result = await validateCertificate(normalized, controller.signal);
      if (!controller.signal.aborted) {
        setCertificate(result);
        window.history.replaceState(null, "", `/certificados?codigo=${normalized}`);
      }
    } catch (e) { if (!controller.signal.aborted) setError(certificateError(e)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  useEffect(() => {
    if (initialCode) void search(initialCode);
    return () => request.current?.abort();
  }, []);

  return <ScrollView style={{ flex: 1, backgroundColor: "#FCFCFF" }} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
    <View style={{ width: "100%", maxWidth: 920, alignSelf: "center", gap: 24 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 20, paddingBottom: 20, borderBottomWidth: 1, borderColor: "#DCE1ED" }}>
        <Image source={require("../../../assets/icon.png")} style={{ width: 64, height: 64, backgroundColor: "#0B0B0F", borderRadius: 8 }} />
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 24, color: "#171923" }}>XIV SECOMP</Text>
          <Text style={{ fontFamily: "Inter_400Regular", color: "#555C6E", lineHeight: 22 }}>Validação de certificados</Text>
        </View>
        <Image accessibilityLabel="Departamento de Computação da UFSCar" source={require("../../../assets/certificate/logo-departamento-computacao-ufscar.png")} resizeMode="contain" style={{ width: 174, height: 44 }} />
        <Image accessibilityLabel="UFSCar" source={require("../../../assets/certificate/logo-ufscar-fundo-transparente.png")} resizeMode="contain" style={{ width: 60, height: 44 }} />
      </View>
      <View style={{ gap: 10 }}>
        <Text style={{ color: "#171923", fontFamily: "Inter_500Medium" }}>Código do certificado</Text>
        <TextInput accessibilityLabel="Código do certificado" value={code} onChangeText={value => { request.current?.abort(); setLoading(false); setCode(value); setCertificate(null); setError(""); }} onSubmitEditing={() => void search(code)} autoCapitalize="characters" autoCorrect={false} maxLength={64} style={{ minHeight: 48, padding: 12, borderWidth: 1, borderColor: "#737B8C", borderRadius: 6, color: "#171923", fontFamily: "Inter_400Regular" }} />
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => void search(code)} style={{ minHeight: 48, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#1400FF", borderRadius: 6, padding: 12 }}>
          {loading ? <ActivityIndicator color="white" /> : <Search color="white" size={18} />}
          <Text style={{ color: "white", fontFamily: "Inter_500Medium" }}>{loading ? "Consultando..." : "Validar certificado"}</Text>
        </Pressable>
      </View>
      {!!error && <Text accessibilityRole="alert" style={{ color: "#B42318", fontFamily: "Inter_400Regular", lineHeight: 23 }}>{error}</Text>}
      {certificate && <View style={{ gap: 20 }}>
        <Text accessibilityRole="header" style={{ color: "#087443", fontFamily: "Poppins_600SemiBold", fontSize: 22 }}>Certificado válido</Text>
        <Text style={{ color: "#171923", fontFamily: "Poppins_600SemiBold", fontSize: 20 }}>{certificate.participantName}</Text>
        <Text style={{ color: "#171923", fontFamily: "Inter_400Regular", lineHeight: 24 }}>XIV SECOMP · {certificateWorkload(certificate.totalMinutes)}{"\n"}Emitido em {new Date(certificate.issuedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</Text>
        <Pressable accessibilityRole="button" disabled={downloading} onPress={async () => { setDownloading(true); setError(""); try { await downloadCertificate(certificate); } catch (e) { setError(certificateError(e)); } finally { setDownloading(false); } }} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 12, backgroundColor: "#171923", borderRadius: 6 }}>
          <Download color="white" size={18} /><Text style={{ color: "white", fontFamily: "Inter_500Medium" }}>{downloading ? "Preparando PDF..." : "Baixar PDF"}</Text>
        </Pressable>
        <Text style={{ color: "#171923", fontFamily: "Poppins_600SemiBold", fontSize: 18 }}>Atividades realizadas</Text>
        {certificate.activities.map((activity, i) => <View key={i} style={{ gap: 8, paddingBottom: 16, borderBottomWidth: 1, borderColor: "#DCE1ED" }}>
          <Text style={{ color: "#171923", fontFamily: "Inter_500Medium", lineHeight: 23 }}>{activity.name}</Text>
          <Text style={{ color: "#555C6E", fontFamily: "Inter_400Regular", lineHeight: 22 }}>{certificateActivityDate(activity.startsAt)} · {certificateWorkload(activity.minutes)}</Text>
        </View>)}
      </View>}
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL("/")} style={{ paddingVertical: 12 }}><Text style={{ color: "#1400FF", fontFamily: "Inter_500Medium" }}>Ir para o app da SECOMP</Text></Pressable>
    </View>
  </ScrollView>;
}
