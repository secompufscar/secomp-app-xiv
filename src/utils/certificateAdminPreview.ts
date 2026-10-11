import type { CertificateData } from "../services/certificates";
import { certificatePresentation } from "./certificatePresentation";

// The final G makes this 32-character example impossible to validate as a real code.
export const adminTestCode = "0000000000000000000000000000000G";
export interface AdminTestCertificate extends CertificateData {
  kind: "admin-test";
  code: typeof adminTestCode;
  participantName: "Nome de Exemplo";
}

export function checkedAdminTestCertificate(data: AdminTestCertificate): AdminTestCertificate {
  const validDate = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
  if (!data || data.kind !== "admin-test" || data.code !== adminTestCode
    || data.participantName !== "Nome de Exemplo" || !validDate(data.issuedAt)
    || !data.event || !Number.isInteger(data.event.year) || data.event.year < 1900 || data.event.year > 9999
    || !validDate(data.event.startDate) || !validDate(data.event.endDate)
    || Date.parse(data.event.startDate) > Date.parse(data.event.endDate)
    || !Array.isArray(data.activities) || !data.activities.length
    || data.activities.some(activity => !activity || typeof activity.name !== "string" || !activity.name.trim()
      || typeof activity.category !== "string" || !activity.category.trim()
      || !(activity.startsAt === null || validDate(activity.startsAt))
      || !Number.isInteger(activity.minutes) || activity.minutes <= 0 || activity.minutes > 10080)
    || !Number.isSafeInteger(data.totalMinutes) || data.totalMinutes <= 0
    || data.activities.reduce((sum, activity) => sum + activity.minutes, 0) !== data.totalMinutes
    || typeof data.qrCode !== "string" || !/^data:image\/png;base64,/.test(data.qrCode)) {
    throw new Error("Dados do certificado de teste inválidos.");
  }
  const url = new URL(data.validationUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash
    || url.searchParams.size !== 1 || url.searchParams.get("codigo") !== adminTestCode) {
    throw new Error("O certificado de teste não pode ter um endereço de validação válido.");
  }
  return { ...data, presentation: certificatePresentation(data) };
}

