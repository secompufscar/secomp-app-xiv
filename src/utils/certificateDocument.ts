import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { CertificateData } from "../services/certificates";

type Assets = { secomp: Uint8Array; dc: Uint8Array; ufscar: Uint8Array; regular: Uint8Array; bold: Uint8Array };
const workload = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`;
const date = (value: string, timeZone = "UTC") => new Date(value).toLocaleDateString("pt-BR", { timeZone });
const binary = (bytes: Uint8Array) => Array.from(bytes, b => String.fromCharCode(b)).join("");

export function createCertificatePdf(certificate: CertificateData, assets: Assets) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("Inter.ttf", binary(assets.regular));
  doc.addFont("Inter.ttf", "Inter", "normal");
  doc.addFileToVFS("Poppins.ttf", binary(assets.bold));
  doc.addFont("Poppins.ttf", "Poppins", "normal");
  doc.setProperties({ title: "Certificado de participação - XIV SECOMP", author: "SECOMP UFSCar", subject: certificate.code });

  function text(value: string, x: number, y: number, size = 10, bold = false, color = "#171923") {
    doc.setFont(bold ? "Poppins" : "Inter", "normal").setFontSize(size).setTextColor(color).text(value, x, y);
  }
  function fitted(value: string, x: number, y: number, width: number, size: number, bold = false) {
    doc.setFont(bold ? "Poppins" : "Inter", "normal").setFontSize(size);
    const actual = Math.min(size, size * width / Math.max(width, doc.getTextWidth(value)));
    text(value, x, y, actual, bold);
  }
  function logo(bytes: Uint8Array, x: number, centerY: number, width: number) {
    const props = doc.getImageProperties(bytes), height = width * props.height / props.width;
    doc.addImage(bytes, "PNG", x, centerY - height / 2, width, height);
  }
  function frame(annex = false) {
    doc.setFillColor("#FCFCFF").rect(0, 0, 297, 210, "F");
    doc.setFillColor("#0B0B0F").rect(0, 0, 64.5, 210, "F");
    doc.setFillColor("#00FF66").rect(64.5, 0, 1.3, 210, "F");
    logo(assets.secomp, 10, 25, 44);
    text("SECOMP", 10, 53, 22, true, "#FFFFFF");
    text("UFSCar / São Carlos", 10, 61, 9, false, "#A9B4F4");
    text("XIV", 10, 100, 64, true, "#FFFFFF");
    text(annex ? "Registro de" : "Semana", 11, 120, 14, false, "#FFFFFF");
    text(annex ? "atividades" : "Acadêmica da", 11, 130, 14, false, "#FFFFFF");
    text(annex ? "realizadas" : "Computação", 11, 140, 14, false, "#FFFFFF");
    text("2026", 11, 194, 23, true, "#00FF66");
    text("XIV SECOMP", 80, 17, 11, true, "#1400FF");
    text("Semana Acadêmica da Computação", 80, 24, 8, false, "#555C6E");
    logo(assets.dc, 188, 18, 58);
    logo(assets.ufscar, 259, 18, 20);
    doc.setDrawColor("#DCE1ED").line(80, 29, 279, 29);
    if (annex) {
      text("Atividades realizadas", 80, 43, 21, true);
      fitted(certificate.participantName, 80, 54, 198, 12, true);
    }
  }
  frame();
  text("Certificado", 79, 48, 38, true);
  text("DE PARTICIPAÇÃO", 80, 58, 10);
  text("Certificamos que", 80, 72, 11);
  fitted(certificate.participantName, 80, 87, 198, 27, true);
  doc.setDrawColor("#1400FF").setLineWidth(0.8).line(80, 94, 105, 94);
  text("participou da XIV Semana Acadêmica da Computação da UFSCar,", 80, 108, 10);
  text(`realizada de ${date(certificate.event.startDate)} a ${date(certificate.event.endDate)}, em São Carlos - SP.`, 80, 116, 10);
  doc.setFillColor("#EEF0FC").roundedRect(80, 125, 199, 25, 2, 2, "F");
  text("CARGA HORÁRIA TOTAL", 86, 133, 8);
  text(workload(certificate.totalMinutes), 86, 145, 23, true, "#1400FF");
  text("Atividades com presença registrada.", 168, 138, 9);
  text("Relação e durações no anexo.", 168, 145, 9);
  text(`São Carlos, ${date(certificate.issuedAt, "America/Sao_Paulo")}.`, 80, 161, 10);
  text("Comissão organizadora da XIV SECOMP", 80, 174, 10, true);

  doc.addPage();
  autoTable(doc, {
    startY: 62, margin: { left: 80, right: 18, top: 62, bottom: 36 },
    head: [["DATA / INÍCIO", "ATIVIDADE COM PRESENÇA", "DURAÇÃO"]],
    body: certificate.activities.map(a => [a.startsAt ? `${date(a.startsAt)}\n${a.startsAt.slice(11, 16)}` : "Não informado", `${a.name}\n${a.category}`, workload(a.minutes)]),
    foot: [[{ content: "CARGA HORÁRIA TOTAL", colSpan: 2 }, workload(certificate.totalMinutes)]],
    showFoot: "lastPage", theme: "plain", rowPageBreak: "avoid",
    styles: { font: "Inter", fontStyle: "normal", fontSize: 9, cellPadding: 3, overflow: "linebreak", textColor: "#171923", lineColor: "#E0E3ED", lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: "#EEF0FC", fontStyle: "normal", fontSize: 8 },
    footStyles: { fillColor: "#EEF0FC", fontStyle: "normal" },
    columnStyles: { 0: { cellWidth: 33 }, 1: { cellWidth: 137 }, 2: { cellWidth: 29, halign: "right" } },
    willDrawPage: () => frame(true),
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor("#DCE1ED").setLineWidth(0.2).line(80, 179, 279, 179);
    text(certificate.code, 80, 186, 9, true);
    text("Validação pública por código ou QR", 80, 193, 8);
    doc.setFont("Inter", "normal").setFontSize(7).setTextColor("#1400FF");
    doc.textWithLink(new URL(certificate.validationUrl).origin + "/certificados", 80, 199, { url: certificate.validationUrl });
    doc.addImage(certificate.qrCode, "PNG", 251, 181, 24, 24);
    text(`Página ${page} de ${pages}`, 205, 202, 8);
  }
  return doc;
}
