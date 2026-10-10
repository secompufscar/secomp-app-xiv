import { Asset } from "expo-asset";
import type { CertificateData } from "./certificates";
import { createCertificatePdf } from "../utils/certificateDocument";

async function bytes(module: number): Promise<Uint8Array> {
  const asset = Asset.fromModule(module);
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error("Não foi possível carregar os elementos do certificado. Tente novamente.");
  return new Uint8Array(await response.arrayBuffer());
}

export async function downloadCertificate(certificate: CertificateData): Promise<void> {
  const [secomp, dc, ufscar, regular, bold] = await Promise.all([
    bytes(require("../../assets/icon.png")),
    bytes(require("../../assets/certificate/logo-departamento-computacao-ufscar.png")),
    bytes(require("../../assets/certificate/logo-ufscar-fundo-transparente.png")),
    bytes(require("@expo-google-fonts/inter/Inter_400Regular.ttf")),
    bytes(require("@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf")),
  ]);
  createCertificatePdf(certificate, { secomp, dc, ufscar, regular, bold }).save(`certificado-xiv-secomp-${certificate.code}.pdf`);
}
