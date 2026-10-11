import { checkedAdminTestCertificate, type AdminTestCertificate } from "./certificateAdminPreview";
import { createCertificatePdf } from "./certificateDocument";
import type { CertificateAssets } from "./certificateDocumentV1";

export function createAdminTestCertificatePdf(input: AdminTestCertificate, assets: CertificateAssets) {
  return createCertificatePdf(checkedAdminTestCertificate(input), assets);
}
