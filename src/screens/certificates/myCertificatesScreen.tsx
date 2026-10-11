import { useCallback, useRef, useState, type ReactElement } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Award, ChevronDown, Download, ExternalLink, RefreshCw } from "lucide-react-native";
import AppLayout from "../../components/app/appLayout";
import BackButton from "../../components/button/backButton";
import { useAuth } from "../../hooks/AuthContext";
import { CertificateData, CertificateSummary, certificateActivityDate, certificateError, certificateIssuedAt, certificateWorkload, getMyCertificate, issueMyCertificate, listMyCertificates } from "../../services/certificates";
import { downloadCertificate } from "../../services/certificateDownload";
import { supportsCertificateTemplate } from "../../utils/certificatePresentation";

const label = (item: CertificateSummary) => `${item.edition ? `${item.edition} SECOMP` : "Edição não identificada"}${item.year ? ` · ${item.year}` : ""}`;
const button = { minHeight: 48, padding: 12, borderRadius: 6, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8 };
const regular = { fontFamily: "Inter_400Regular", color: "#A9B4F4", lineHeight: 23 };

function checkSelection(result: CertificateData, item: CertificateSummary) {
  if (result.code !== item.code || result.event.year !== item.year
    || result.presentation?.edition !== item.edition || result.presentation?.templateId !== item.templateId) {
    throw new Error("O certificado recebido não corresponde à edição selecionada.");
  }
}

export default function MyCertificatesScreen(): ReactElement | null {
  const { user, isParticipantView } = useAuth();
  const allowed = Platform.OS === "web" && !!user?.id;
  const [items, setItems] = useState<CertificateSummary[] | null>(null);
  const [selected, setSelected] = useState<CertificateSummary | null>(null);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false);
  const [emitting, setEmitting] = useState(false), [downloading, setDownloading] = useState(false);
  const [listError, setListError] = useState(""), [detailError, setDetailError] = useState(""), [issueError, setIssueError] = useState("");
  const focused = useRef(false), focusGeneration = useRef(0), listGeneration = useRef(0), detailGeneration = useRef(0);
  const selectedRef = useRef<CertificateSummary | null>(null);
  const listRequest = useRef<AbortController | null>(null), detailRequest = useRef<AbortController | null>(null), downloadRequest = useRef<AbortController | null>(null);
  const issuePending = useRef(false);

  function revoked(item: CertificateSummary) {
    const value = { ...item, status: "revoked" as const };
    selectedRef.current = value; setSelected(value); setCertificate(null);
    setItems(previous => previous?.map(current => current.code === item.code ? value : current) ?? null);
  }

  const selectCertificate = useCallback(async (item: CertificateSummary | null) => {
    if (!allowed || !focused.current) return;
    const generation = ++detailGeneration.current;
    detailRequest.current?.abort(); downloadRequest.current?.abort();
    downloadRequest.current = null; setDownloading(false);
    selectedRef.current = item; setSelected(item); setCertificate(null); setDetailError(""); setDetailLoading(false);
    if (!item || item.status !== "active" || !supportsCertificateTemplate(item.templateId)) return;
    const controller = new AbortController(); detailRequest.current = controller;
    setDetailLoading(true);
    try {
      const result = await getMyCertificate(item.code, controller.signal);
      checkSelection(result, item);
      if (generation === detailGeneration.current && focused.current) setCertificate(result);
    } catch (error: any) {
      if (generation === detailGeneration.current && focused.current) {
        if (error.response?.status === 410) revoked(item);
        setDetailError(certificateError(error));
      }
    } finally { if (generation === detailGeneration.current && focused.current) setDetailLoading(false); }
  }, [allowed]);

  const loadList = useCallback(async (preferred?: string) => {
    if (!allowed || !focused.current) return;
    const generation = ++listGeneration.current;
    const previous = selectedRef.current;
    const previousCode = preferred ?? previous?.code;
    listRequest.current?.abort();
    const controller = new AbortController(); listRequest.current = controller;
    void selectCertificate(null); setItems(null); setLoading(true); setListError("");
    try {
      const result = await listMyCertificates(controller.signal);
      if (generation === listGeneration.current && focused.current) {
        setItems(result);
        void selectCertificate(result.find(item => item.code === previousCode)
          ?? (previous?.year ? result.find(item => item.year === previous.year) : undefined) ?? result[0] ?? null);
      }
    } catch (error) {
      if (generation === listGeneration.current && focused.current) setListError(certificateError(error));
    } finally { if (generation === listGeneration.current && focused.current) setLoading(false); }
  }, [allowed, selectCertificate]);

  useFocusEffect(useCallback(() => {
    focused.current = true; focusGeneration.current++;
    setIssueError(""); void loadList();
    return () => {
      focused.current = false; focusGeneration.current++; listGeneration.current++; detailGeneration.current++;
      listRequest.current?.abort(); detailRequest.current?.abort(); downloadRequest.current?.abort();
      downloadRequest.current = null;
      selectedRef.current = null; setItems(null); setSelected(null); setCertificate(null);
      setLoading(true); setDetailLoading(false); setEmitting(false); setDownloading(false);
    };
  }, [loadList, user?.id]));

  async function generate() {
    if (!allowed || isParticipantView || !focused.current || issuePending.current) return;
    const focus = focusGeneration.current, selection = detailGeneration.current;
    issuePending.current = true; setEmitting(true); setIssueError("");
    try {
      const result = await issueMyCertificate();
      if (focused.current && focus === focusGeneration.current) {
        await loadList(selection === detailGeneration.current ? result.code : selectedRef.current?.code);
      }
    } catch (error) {
      if (focused.current && focus === focusGeneration.current) setIssueError(certificateError(error));
    } finally {
      issuePending.current = false;
      if (focused.current && focus === focusGeneration.current) setEmitting(false);
    }
  }

  async function download() {
    const item = selectedRef.current;
    if (!allowed || !focused.current || !item || item.status !== "active" || !certificate || downloadRequest.current) return;
    const generation = detailGeneration.current;
    const controller = new AbortController(); downloadRequest.current = controller;
    setDownloading(true); setDetailError("");
    try {
      const fresh = await getMyCertificate(item.code, controller.signal);
      checkSelection(fresh, item);
      if (focused.current && generation === detailGeneration.current && !controller.signal.aborted) await downloadCertificate(fresh, controller.signal);
    } catch (error: any) {
      if (focused.current && generation === detailGeneration.current) {
        if (error.response?.status === 410) revoked(item);
        setDetailError(certificateError(error));
      }
    } finally {
      if (downloadRequest.current === controller) {
        downloadRequest.current = null;
        if (focused.current) setDownloading(false);
      }
    }
  }

  if (!allowed) return null;
  const compatible = selected?.status === "active" && supportsCertificateTemplate(selected.templateId);
  return <View className="flex-1 bg-blue-900">
    <AppLayout>
      <BackButton />
      <View style={{ gap: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottomWidth: 1, borderColor: "#374151", paddingBottom: 20 }}>
          <Text accessibilityRole="header" style={{ fontFamily: "Poppins_600SemiBold", fontSize: 24, color: "#FFFFFF" }}>Meus certificados</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, maxWidth: "100%" }}>
          {!isParticipantView && <Pressable accessibilityRole="button" accessibilityLabel="Gerar certificado da edição habilitada" disabled={emitting} onPress={generate} style={{ ...button, backgroundColor: "#1400FF", opacity: emitting ? 0.6 : 1, maxWidth: "100%" }}>
            {emitting ? <ActivityIndicator color="white" /> : <Award color="white" size={18} />}
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "white", flexShrink: 1 }}>{emitting ? "Gerando..." : "Gerar certificado da edição habilitada"}</Text>
          </Pressable>}
          </View>
        </View>
        {!!issueError && <Text accessibilityRole="alert" style={{ ...regular, color: "#FDA4AF" }}>{issueError}</Text>}
        {loading ? <ActivityIndicator accessibilityLabel="Carregando meus certificados" color="white" /> : listError ? <View style={{ gap: 12 }}>
          <Text accessibilityRole="alert" style={{ ...regular, color: "#FDA4AF" }}>{listError}</Text>
          <Pressable accessibilityRole="button" onPress={() => void loadList()} style={{ ...button, borderWidth: 1, borderColor: "#737B8C" }}><RefreshCw color="white" size={18} /><Text style={{ color: "white" }}>Tentar novamente</Text></Pressable>
        </View> : <>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0, maxWidth: 480, gap: 8 }}>
              <Text style={regular}>Edição</Text>
              <div style={{ position: "relative", height: 48 }}>
              <select aria-label="Edição do certificado" disabled={!items?.length} value={selected?.code ?? ""} onChange={event => void selectCertificate(items?.find(item => item.code === event.target.value) ?? null)} style={{ width: "100%", height: 48, boxSizing: "border-box", border: "1px solid #737B8C", borderRadius: 6, backgroundColor: "#14131C", color: "#FFFFFF", appearance: "none", padding: "12px 44px 12px 12px", fontFamily: "Inter_400Regular", fontSize: 14 }}>
                {!items?.length && <option value="">Nenhum certificado</option>}
                {items?.map(item => <option key={item.code} value={item.code}>{label(item)}{item.status === "revoked" ? " · Revogado" : item.status === "unavailable" ? " · Indisponível" : ""}</option>)}
              </select>
              <div aria-hidden="true" data-certificate-chevron style={{ position: "absolute", right: 12, top: 15, width: 18, height: 18, pointerEvents: "none", display: "flex", opacity: items?.length ? 1 : 0.5 }}><ChevronDown color="#FFFFFF" size={18} /></div>
              </div>
            </View>
            <div title="Atualizar certificados" style={{ display: "flex", flexShrink: 0, width: 48, height: 48 }}><Pressable accessibilityRole="button" accessibilityLabel="Atualizar certificados" onPress={() => void loadList()} style={{ ...button, width: 48, height: 48, borderWidth: 1, borderColor: "#737B8C" }}><RefreshCw color="white" size={18} /></Pressable></div>
          </View>
          {!items?.length && <Text style={regular}>Você ainda não possui certificados emitidos.</Text>}
          {selected && <View style={{ gap: 16, borderTopWidth: 1, borderColor: "#374151", paddingTop: 20 }}>
            <View style={{ gap: 6 }}>
              <Text accessibilityRole="header" style={{ fontFamily: "Poppins_600SemiBold", fontSize: 20, color: "white" }}>{label(selected)}</Text>
              <Text style={{ ...regular, color: selected.status === "revoked" ? "#FDA4AF" : compatible ? "#00FF66" : "#FCD34D" }}>{selected.status === "revoked" ? "Certificado revogado" : compatible ? "Certificado ativo" : "Modelo de certificado indisponível"}</Text>
              <Text style={regular}>{certificateWorkload(selected.totalMinutes)}{"\n"}Emitido em {certificateIssuedAt(selected.issuedAt)} · Revisão {selected.revision}</Text>
            </View>
            {selected.status === "revoked" && <Text style={regular}>Entre em contato com a organização.</Text>}
            {selected.status !== "revoked" && !compatible && <Text style={regular}>Não foi possível abrir este modelo. Entre em contato com a organização.</Text>}
            {detailLoading && <ActivityIndicator accessibilityLabel="Carregando certificado selecionado" color="white" />}
            {!!detailError && <View style={{ gap: 10 }}><Text accessibilityRole="alert" style={{ ...regular, color: "#FDA4AF" }}>{detailError}</Text>
              {compatible && <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar certificado novamente" onPress={() => void selectCertificate(selected)} style={{ ...button, borderWidth: 1, borderColor: "#737B8C" }}><RefreshCw color="white" size={18} /><Text style={{ color: "white" }}>Tentar novamente</Text></Pressable>}
            </View>}
            {certificate && <>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 18, color: "white" }}>{certificate.participantName}</Text>
              <Text selectable style={{ ...regular, fontSize: 12 }}>{certificate.code}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <Pressable accessibilityRole="button" disabled={downloading} onPress={download} style={{ ...button, backgroundColor: "#1400FF", opacity: downloading ? 0.6 : 1 }}>{downloading ? <ActivityIndicator color="white" /> : <Download color="white" size={18} />}<Text style={{ color: "white", fontFamily: "Inter_500Medium" }}>{downloading ? "Preparando PDF..." : "Baixar PDF"}</Text></Pressable>
                <Pressable accessibilityRole="link" onPress={() => Linking.openURL(certificate.validationUrl)} style={{ ...button, borderWidth: 1, borderColor: "#737B8C" }}><ExternalLink color="white" size={18} /><Text style={{ color: "white", fontFamily: "Inter_500Medium" }}>Validar certificado</Text></Pressable>
              </View>
              <Text accessibilityRole="header" style={{ color: "white", fontFamily: "Poppins_600SemiBold", fontSize: 18 }}>Atividades realizadas</Text>
              {certificate.activities.map((activity, index) => <View key={index} style={{ gap: 6, paddingBottom: 14, borderBottomWidth: 1, borderColor: "#374151" }}>
                <Text style={{ ...regular, color: "white", fontFamily: "Inter_500Medium" }}>{activity.name}</Text>
                <Text style={regular}>{certificateActivityDate(activity.startsAt)} · {certificateWorkload(activity.minutes)}</Text>
              </View>)}
            </>}
          </View>}
        </>}
      </View>
    </AppLayout>
  </View>;
}
