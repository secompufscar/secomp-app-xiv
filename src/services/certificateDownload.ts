import type { CertificateData } from "./certificates";

export async function downloadCertificate(_certificate: CertificateData, _signal?: AbortSignal): Promise<void> {
  throw new Error("O download de certificados está disponível na versão web.");
}
