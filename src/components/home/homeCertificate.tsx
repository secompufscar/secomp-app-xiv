import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Award, Download } from "lucide-react-native";
import { CertificateData, certificateError, certificateWorkload, issueMyCertificate } from "../../services/certificates";
import { downloadCertificate } from "../../services/certificateDownload";

export default function HomeCertificate() {
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false);
  const [certificate, setCertificate] = useState<CertificateData | null>(null), [error, setError] = useState("");
  const generation = useRef(0), pending = useRef(false);
  const close = useCallback(() => { generation.current++; setVisible(false); setBusy(false); pending.current = false; setError(""); setCertificate(null); }, []);
  useFocusEffect(useCallback(() => close, [close]));
  if (Platform.OS !== "web") return null;

  async function generate() {
    if (pending.current) return;
    pending.current = true;
    const current = ++generation.current;
    setBusy(true); setError("");
    try {
      const result = await issueMyCertificate();
      if (current === generation.current) setCertificate(result);
    } catch (e) { if (current === generation.current) setError(certificateError(e)); }
    finally { if (current === generation.current) { setBusy(false); pending.current = false; } }
  }

  return <View className="w-full mb-8 gap-4">
    <Text className="text-sm text-green font-poppinsMedium">Certificado de participação</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Gerar certificado" onPress={() => setVisible(true)} className="w-full min-h-[92px] py-4 px-5 flex-row items-center gap-4 border border-iconbg rounded-[8px] bg-background active:opacity-80">
      <Award color="#A9B4F4" size={28} />
      <View className="flex-1 min-w-0 gap-2"><Text className="text-white text-sm font-poppinsMedium">Gerar certificado</Text><Text className="text-default text-xs font-inter leading-relaxed">XIV SECOMP · Certificado e atividades realizadas</Text></View>
    </Pressable>
    <Modal visible={visible} transparent accessibilityLabel="Seu certificado" animationType="fade" onRequestClose={close}>
      <View className="flex-1 justify-center items-center bg-black/70 px-4 py-6">
        <View className="w-full max-w-md max-h-full rounded-lg bg-blue-900 border border-iconbg overflow-hidden p-6">
          <Text accessibilityRole="header" className="text-white text-xl font-poppinsSemiBold mb-4">Seu certificado</Text>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }}>
            {certificate ? <>
              <Text className="text-white font-poppinsMedium">{certificate.participantName}</Text>
              <Text className="text-default font-inter">{certificateWorkload(certificate.totalMinutes)}</Text>
              <Text selectable className="text-default text-xs font-inter">{certificate.code}</Text>
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(certificate.validationUrl)}><Text className="text-blue-100 font-inter underline">Validar certificado</Text></Pressable>
            </> : <Text className="text-default text-sm font-inter leading-relaxed">A emissão exige credenciamento confirmado nesta edição, que comprova sua doação. A carga horária corresponde às atividades com presença registrada e duração definida pela organização.</Text>}
            {!!error && <Text accessibilityRole="alert" className="text-danger text-sm font-inter leading-relaxed">{error}</Text>}
          </ScrollView>
          <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={certificate ? async () => {
            setBusy(true); setError("");
            const current = generation.current;
            try { await downloadCertificate(certificate); } catch (e) { if (current === generation.current) setError(certificateError(e)); }
            finally { if (current === generation.current) setBusy(false); }
          } : generate} className="w-full min-h-[48px] mt-5 py-3 px-4 flex-row gap-2 items-center justify-center rounded-lg bg-blue-500 active:opacity-80">
            {busy ? <ActivityIndicator color="white" /> : certificate ? <Download color="white" size={18} /> : <Award color="white" size={18} />}
            <Text className="text-white text-sm font-poppinsMedium">{busy ? "Preparando..." : certificate ? "Baixar PDF" : "Gerar certificado"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={close} className="min-h-[48px] mt-2 items-center justify-center"><Text className="text-white text-sm font-inter">Fechar</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}
