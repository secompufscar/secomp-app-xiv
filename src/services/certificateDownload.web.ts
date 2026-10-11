import { Asset } from "expo-asset";
import type { CertificateData } from "./certificates";
import { createCertificatePdf } from "../utils/certificateDocument";
import { certificatePresentation } from "../utils/certificatePresentation";
import type { AdminTestCertificate } from "./certificateAdminPreview";
import { createAdminTestCertificatePdf } from "../utils/certificateAdminPreviewDocument";

async function bytes(module: number, signal?: AbortSignal): Promise<Uint8Array> {
  const asset = Asset.fromModule(module);
  const response = await fetch(asset.uri, { signal });
  if (!response.ok) throw new Error("Não foi possível carregar os elementos do certificado. Tente novamente.");
  return new Uint8Array(await response.arrayBuffer());
}

async function certificateAssets(signal?: AbortSignal) {
  const [secomp, dc, ufscar, regular, bold] = await Promise.all([
    bytes(require("../../assets/certificate/v1/secomp.png"), signal),
    bytes(require("../../assets/certificate/v1/dc.png"), signal),
    bytes(require("../../assets/certificate/v1/ufscar.png"), signal),
    bytes(require("../../assets/certificate/v1/Inter-Regular.ttf"), signal),
    bytes(require("../../assets/certificate/v1/Poppins-SemiBold.ttf"), signal),
  ]);
  return { secomp, dc, ufscar, regular, bold };
}

export async function downloadCertificate(certificate: CertificateData, signal?: AbortSignal): Promise<void> {
  const presentation = certificatePresentation(certificate);
  const assets = await certificateAssets(signal);
  if (signal?.aborted) return;
  createCertificatePdf(certificate, assets).save(`certificado-${presentation.edition.toLowerCase()}-secomp-${certificate.code}.pdf`);
}

export async function downloadAdminTestCertificate(certificate: AdminTestCertificate, signal?: AbortSignal): Promise<void> {
  const assets = await certificateAssets(signal);
  if (signal?.aborted) return;
  createAdminTestCertificatePdf(certificate, assets).save("certificado-admin-teste-secomp.pdf");
}
