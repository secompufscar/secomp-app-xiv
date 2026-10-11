import type { CertificateData } from "../services/certificates";
import { certificatePresentation } from "./certificatePresentation";
import { createCertificatePdfV1, CertificateAssets } from "./certificateDocumentV1";

export function createCertificatePdf(certificate: CertificateData, assets: CertificateAssets) {
  const presentation = certificatePresentation(certificate);
  // Keep older renderers when introducing a new template ID.
  if (presentation.templateId === "secomp-landscape-v1") return createCertificatePdfV1(certificate, assets, presentation);
  throw new Error("Modelo de certificado não suportado.");
}
