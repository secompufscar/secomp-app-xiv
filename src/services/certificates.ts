import axios from "axios";
import api from "./api";

export interface CertificateData {
  code: string;
  participantName: string;
  issuedAt: string;
  totalMinutes: number;
  event: { year: number; startDate: string; endDate: string };
  activities: { name: string; category: string; startsAt: string | null; minutes: number }[];
  validationUrl: string;
  qrCode: string;
}

export const certificateCodePattern = /^[A-F0-9]{32}$/;

export function checkedCertificate(data: CertificateData): CertificateData {
  if (!data || !certificateCodePattern.test(data.code) || !data.participantName?.trim()
    || data.event?.year !== 2026 || !Array.isArray(data.activities) || !data.activities.length
    || data.activities.some(a => !a.name || !Number.isInteger(a.minutes) || a.minutes <= 0)
    || data.activities.reduce((sum, a) => sum + a.minutes, 0) !== data.totalMinutes
    || !/^data:image\/png;base64,/.test(data.qrCode)) throw new Error("Dados do certificado inválidos.");
  const url = new URL(data.validationUrl);
  if (url.protocol !== "https:" || url.searchParams.get("codigo") !== data.code) throw new Error("Endereço de validação inválido.");
  return data;
}

export async function issueMyCertificate() {
  return checkedCertificate((await api.post("/certificates/mine", {}, { timeout: 20000 })).data);
}

export async function validateCertificate(code: string, signal?: AbortSignal) {
  if (!certificateCodePattern.test(code)) throw new Error("Código de certificado inválido.");
  // Public validation never sends credentials or starts session recovery.
  return checkedCertificate((await axios.get(`${api.defaults.baseURL}/certificates/validate/${code}`, { signal, timeout: 15000 })).data);
}

export function certificateError(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) return "Certificado não encontrado. Confira o código informado.";
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
