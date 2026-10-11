import { Asset } from "expo-asset";
import type { CertificateData } from "./certificates";
import { createCertificatePdf } from "../utils/certificateDocument";
import { certificatePresentation } from "../utils/certificatePresentation";

async function bytes(module: number, signal?: AbortSignal): Promise<Uint8Array> {
  const asset = Asset.fromModule(module);
  const response = await fetch(asset.uri, { signal });
  if (!response.ok) throw new Error("Não foi possível carregar os elementos do certificado. Tente novamente.");
  return new Uint8Array(await response.arrayBuffer());
}

export async function downloadCertificate(certificate: CertificateData, signal?: AbortSignal): Promise<void> {
  const presentation = certificatePresentation(certificate);
  const [secomp, dc, ufscar, regular, bold] = await Promise.all([
    bytes(require("../../assets/certificate/v1/secomp.png"), signal),
    bytes(require("../../assets/certificate/v1/dc.png"), signal),
    bytes(require("../../assets/certificate/v1/ufscar.png"), signal),
    bytes(require("../../assets/certificate/v1/Inter-Regular.ttf"), signal),
    bytes(require("../../assets/certificate/v1/Poppins-SemiBold.ttf"), signal),
  ]);
  if (signal?.aborted) return;
  createCertificatePdf(certificate, { secomp, dc, ufscar, regular, bold }).save(`certificado-${presentation.edition.toLowerCase()}-secomp-${certificate.code}.pdf`);
}
