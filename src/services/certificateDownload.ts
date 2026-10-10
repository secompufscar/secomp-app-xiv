import type { CertificateData } from "./certificates";

export async function downloadCertificate(_certificate: CertificateData): Promise<void> {
  throw new Error("O download de certificados está disponível na versão web.");
}
