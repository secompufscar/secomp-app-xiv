export interface CertificatePresentation {
  edition: string;
  eventName: string;
  issuer: string;
  city: string;
  location: string;
  templateId: string;
}

const legacyXiv: Readonly<CertificatePresentation> = Object.freeze({
  edition: "XIV", eventName: "Semana Acadêmica da Computação", issuer: "UFSCar",
  city: "São Carlos", location: "São Carlos - SP", templateId: "secomp-landscape-v1",
});

export const supportsCertificateTemplate = (templateId: string | null) => templateId === "secomp-landscape-v1";

export function certificatePresentation(certificate: { event: { year: number }; presentation?: CertificatePresentation }): CertificatePresentation {
  const year = certificate.event?.year;
  const presentation = certificate.presentation === undefined && year === 2026 ? legacyXiv : certificate.presentation;
  if (!Number.isInteger(year) || year < 1900 || year > 9999 || !presentation
    || typeof presentation.edition !== "string" || !/^[IVXLCDM]{1,20}$/.test(presentation.edition)
    || ![presentation.eventName, presentation.issuer, presentation.city, presentation.location].every(value => typeof value === "string" && value.trim() && value.length <= 150 && !/[\r\n]/.test(value))
    || !supportsCertificateTemplate(presentation.templateId)) {
    throw new Error("Edição ou modelo de certificado não suportado. Entre em contato com a organização.");
  }
  return { ...presentation };
}
