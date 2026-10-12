import axios from "axios";
import api from "./api";
import { certificatePresentation, CertificatePresentation } from "../utils/certificatePresentation";
export { certificateIssuedAt } from "../utils/certificateIssuedAt";

export interface CertificateData {
  code: string;
  participantName: string;
  issuedAt: string;
  totalMinutes: number;
  event: { year: number; startDate: string; endDate: string };
  presentation?: CertificatePresentation;
  activities: { name: string; category: string; startsAt: string | null; minutes: number }[];
  validationUrl: string;
  qrCode: string;
}

export const certificateCodePattern = /^[A-F0-9]{32}$/;

export interface CertificateSummary {
  code: string;
  year: number | null;
  edition: string | null;
  templateId: string | null;
  status: "active" | "revoked" | "unavailable";
  revision: number;
  issuedAt: string;
  totalMinutes: number;
}

export async function listMyCertificates(signal?: AbortSignal): Promise<CertificateSummary[]> {
  const { data } = await api.get("/certificates/mine", { signal, timeout: 15000 });
  const items = data?.certificates;
  if (!Array.isArray(items) || items.some(item => !item || typeof item.code !== "string" || !certificateCodePattern.test(item.code)
    || !["active", "revoked", "unavailable"].includes(item.status)
    || !(item.year === null || (Number.isInteger(item.year) && item.year >= 1900 && item.year <= 9999))
    || !(item.edition === null || (typeof item.edition === "string" && /^[IVXLCDM]{1,20}$/.test(item.edition)))
    || !(item.templateId === null || (typeof item.templateId === "string" && item.templateId.trim()))
    || (item.status === "active" && (!item.year || !item.edition || !item.templateId))
    || !Number.isInteger(item.totalMinutes) || item.totalMinutes <= 0
    || !Number.isInteger(item.revision) || item.revision <= 0
    || typeof item.issuedAt !== "string" || !Number.isFinite(Date.parse(item.issuedAt)))
    || new Set(items.map(item => item.code)).size !== items.length) throw new Error("Lista de certificados inválida.");
  return [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || Date.parse(b.issuedAt) - Date.parse(a.issuedAt));
}

export async function getMyCertificate(code: string, signal?: AbortSignal): Promise<CertificateData> {
  if (!certificateCodePattern.test(code)) throw new Error("Código de certificado inválido.");
  const certificate = checkedCertificate((await api.get(`/certificates/mine/${code}`, { signal, timeout: 15000 })).data);
  if (certificate.code !== code) throw new Error("O certificado recebido não corresponde à seleção.");
  return certificate;
}

export function checkedCertificate(data: CertificateData): CertificateData {
  return checkedDocument(data, certificateCodePattern);
}

function checkedDocument(data: CertificateData, codePattern: RegExp): CertificateData {
  if (!data || typeof data.code !== "string" || !codePattern.test(data.code)
    || typeof data.participantName !== "string" || !data.participantName.trim()
    || typeof data.issuedAt !== "string" || !Number.isFinite(Date.parse(data.issuedAt))
    || !data.event || !Array.isArray(data.activities) || !data.activities.length
    || typeof data.event.startDate !== "string" || !Number.isFinite(Date.parse(data.event.startDate))
    || typeof data.event.endDate !== "string" || !Number.isFinite(Date.parse(data.event.endDate))
    || Date.parse(data.event.startDate) > Date.parse(data.event.endDate)
    || data.activities.some(a => !a || typeof a.name !== "string" || !a.name.trim()
      || typeof a.category !== "string" || !a.category.trim()
      || !(a.startsAt === null || (typeof a.startsAt === "string" && Number.isFinite(Date.parse(a.startsAt))))
      || !Number.isInteger(a.minutes) || a.minutes <= 0 || a.minutes > 10080)
    || !Number.isSafeInteger(data.totalMinutes) || data.totalMinutes <= 0
    || data.activities.reduce((sum, a) => sum + a.minutes, 0) !== data.totalMinutes
    || typeof data.qrCode !== "string" || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.qrCode)
    || typeof data.validationUrl !== "string") throw new Error("Dados do certificado inválidos.");
  const url = new URL(data.validationUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash
    || url.searchParams.getAll("codigo").length !== 1 || url.searchParams.get("codigo") !== data.code) throw new Error("Endereço de validação inválido.");
  return { ...data, presentation: certificatePresentation(data) };
}

export async function getCertificateExample(signal?: AbortSignal): Promise<CertificateData> {
  const { data } = await api.get("/certificates/admin/example", { signal, timeout: 15000 });
  if (data?.participantName !== "Nome de Exemplo") throw new Error("Dados do modelo de exemplo inválidos.");
  return checkedDocument(data, /^0{31}G$/);
}

export async function issueMyCertificate(signal?: AbortSignal) {
  return checkedCertificate((await api.post("/certificates/mine", {}, { signal, timeout: 20000 })).data);
}

export async function validateCertificate(code: string, signal?: AbortSignal) {
  if (!certificateCodePattern.test(code)) throw new Error("Código de certificado inválido.");
  // Public validation never sends credentials or starts session recovery.
  const certificate = checkedCertificate((await axios.get(`${api.defaults.baseURL}/certificates/validate/${code}`, { signal, timeout: 15000 })).data);
  if (certificate.code !== code) throw new Error("O certificado recebido não corresponde ao código consultado.");
  return certificate;
}

export function certificateError(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) return "Certificado não encontrado. Confira o código informado.";
    if (error.response?.status === 410) return "Certificado revogado. Entre em contato com a organização.";
    if ([403, 409].includes(error.response?.status ?? 0)) return error.response?.data?.message || "Certificado indisponível.";
    if (error.response?.status === 429) return "Muitas tentativas. Aguarde um minuto e tente novamente.";
    return "Não foi possível consultar o certificado. Tente novamente.";
  }
  return error instanceof Error ? error.message : "Não foi possível gerar o certificado.";
}

export function certificateWorkload(minutes: number) {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? "hora" : "horas"}` : "", rest ? `${rest} ${rest === 1 ? "minuto" : "minutos"}` : ""].filter(Boolean).join(" e ");
}

export function certificateActivityDate(value: string | null) {
  if (!value) return "Horário não informado";
  // The schedule stores wall-clock times with a Z suffix; match the existing app.
  return new Date(value).toLocaleString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
