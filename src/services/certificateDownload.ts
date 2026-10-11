import type { CertificateData } from "./certificates";
import type { AdminTestCertificate } from "./certificateAdminPreview";

export async function downloadCertificate(_certificate: CertificateData, _signal?: AbortSignal): Promise<void> {
  throw new Error("O download de certificados está disponível na versão web.");
}

export async function downloadAdminTestCertificate(_certificate: AdminTestCertificate, _signal?: AbortSignal): Promise<void> {
  throw new Error("O download de certificados está disponível na versão web.");
}
