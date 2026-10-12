import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { CertificateData } from "../services/certificates";
import type { CertificatePresentation } from "./certificatePresentation";
import { certificateIssuedAt } from "./certificateIssuedAt";

export type CertificateAssets = { secomp: Uint8Array; dc: Uint8Array; ufscar: Uint8Array; regular: Uint8Array; bold: Uint8Array };
const workload = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`;
const fullWorkload = (minutes: number) => {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? "hora" : "horas"}` : "", rest ? `${rest} ${rest === 1 ? "minuto" : "minutos"}` : ""].filter(Boolean).join(" e ");
};
const date = (value: string, timeZone = "UTC") => new Date(value).toLocaleDateString("pt-BR", { timeZone });
const binary = (bytes: Uint8Array) => Array.from(bytes, b => String.fromCharCode(b)).join("");
const categoryLabels: Record<string, string> = { Palestras: "Palestra", Minicursos: "Minicurso" };

export function createCertificatePdfV1(certificate: CertificateData, assets: CertificateAssets, presentation: CertificatePresentation) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("Inter.ttf", binary(assets.regular));
  doc.addFont("Inter.ttf", "Inter", "normal");
  doc.addFileToVFS("Poppins.ttf", binary(assets.bold));
  doc.addFont("Poppins.ttf", "Poppins", "normal");
  doc.setProperties({ title: `Certificado de participação - ${presentation.edition} SECOMP`, author: `SECOMP ${presentation.issuer}`, subject: certificate.code });

  function text(value: string, x: number, y: number, size = 10, bold = false, color = "#171923") {
    doc.setFont(bold ? "Poppins" : "Inter", "normal").setFontSize(size).setTextColor(color).text(value, x, y);
  }
  function fitted(value: string, x: number, y: number, width: number, size: number, bold = false, color = "#171923") {
    doc.setFont(bold ? "Poppins" : "Inter", "normal").setFontSize(size);
    const actual = Math.min(size, size * width / Math.max(width, doc.getTextWidth(value)));
    text(value, x, y, actual, bold, color);
  }
  function logo(bytes: Uint8Array, x: number, centerY: number, width: number) {
    const props = doc.getImageProperties(bytes), height = width * props.height / props.width;
    doc.addImage(bytes, "PNG", x, centerY - height / 2, width, height);
  }
  // The horizontal DC wordmark needs a smaller height for optical balance.
  const dcWidth = 40;
  const ufscar = doc.getImageProperties(assets.ufscar);
  const ufscarWidth = 14 * ufscar.width / ufscar.height;
  const ufscarX = 279 - ufscarWidth;
  function frame(annex = false) {
    doc.setFillColor("#FCFCFF").rect(0, 0, 297, 210, "F");
    doc.setFillColor("#0B0B0F").rect(0, 0, 64.5, 210, "F");
    doc.setFillColor("#00FF66").rect(64.5, 0, 1.3, 210, "F");
    logo(assets.secomp, 10, 25, 44);
    text("SECOMP", 10, 53, 22, true, "#FFFFFF");
    fitted(`${presentation.issuer} / ${presentation.city}`, 10, 61, 44, 9, false, "#A9B4F4");
    fitted(presentation.edition, 10, 100, 44, 64, true, "#FFFFFF");
    text(annex ? "Registro de" : "Semana", 11, 120, 14, false, "#FFFFFF");
    text(annex ? "atividades" : "Acadêmica da", 11, 130, 14, false, "#FFFFFF");
    text(annex ? "realizadas" : "Computação", 11, 140, 14, false, "#FFFFFF");
    text(String(certificate.event.year), 11, 194, 23, true, "#00FF66");
    fitted(`${presentation.edition} SECOMP`, 80, 17, 106, 11, true, "#1400FF");
    fitted(presentation.eventName, 80, 24, 106, 8, false, "#555C6E");
    logo(assets.dc, ufscarX - 12 - dcWidth, 18, dcWidth);
    logo(assets.ufscar, ufscarX, 18, ufscarWidth);
    doc.setDrawColor("#DCE1ED").setLineWidth(0.2).line(80, 29, 279, 29);
    if (annex) {
      text("Atividades realizadas", 80, 43, 21, true);
      fitted(certificate.participantName, 80, 54, 198, 12, true);
    }
  }
  frame();
  text("Certificado", 79, 48, 38, true);
  text("DE PARTICIPAÇÃO", 80, 58, 10);
  fitted(`A Comissão Organizadora da ${presentation.edition} SECOMP certifica que`, 80, 77, 199, 11);
  fitted(certificate.participantName, 80, 94, 198, 27, true);
  doc.setDrawColor("#1400FF").setLineWidth(0.8).line(80, 101, 105, 101);
  fitted(`participou da ${presentation.edition} ${presentation.eventName} da ${presentation.issuer},`, 80, 117, 199, 10);
  fitted(`realizada de ${date(certificate.event.startDate)} a ${date(certificate.event.endDate)}, em ${presentation.location}.`, 80, 125, 199, 10);
  doc.setFillColor("#EEF0FC").roundedRect(80, 136, 199, 25, 2, 2, "F");
  text("CARGA HORÁRIA TOTAL", 86, 144, 8);
  fitted(fullWorkload(certificate.totalMinutes), 86, 156, 187, 23, true, "#1400FF");

  doc.addPage();
  doc.setLineHeightFactor(1);
  autoTable(doc, {
    startY: 60, margin: { left: 80, right: 18, top: 60, bottom: 34 },
    head: [["DATA", "HORÁRIO", "ATIVIDADE COM PRESENÇA", "DURAÇÃO"]],
    body: certificate.activities.map(a => [a.startsAt ? date(a.startsAt) : "Não informado", a.startsAt ? a.startsAt.slice(11, 16) : "-", a.name, workload(a.minutes)]),
    foot: [[{ content: "CARGA HORÁRIA TOTAL", colSpan: 3 }, workload(certificate.totalMinutes)]],
    showFoot: "lastPage", theme: "plain", rowPageBreak: "avoid",
    styles: { font: "Inter", fontStyle: "normal", fontSize: 9, cellPadding: { top: 0.9, bottom: 0.9, left: 2.5, right: 2.5 }, overflow: "linebreak", textColor: "#171923", lineColor: "#E0E3ED", lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: "#EEF0FC", fontStyle: "normal", fontSize: 8, cellPadding: 2 },
    footStyles: { fillColor: "#EEF0FC", font: "Poppins", fontStyle: "normal", fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 15, halign: "center" }, 2: { cellWidth: 136 }, 3: { cellWidth: 24, halign: "right" } },
    didParseCell: data => {
      if (data.column.index === 3) {
        data.cell.styles.halign = "right";
        if (data.section !== "body") data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 2.5, right: 2.5 };
      }
      if (data.column.index === 1) {
        data.cell.styles.halign = "center";
        if (data.section === "head") data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 1, right: 1 };
      }
      // Reserve a separate line for the quieter category label below the title.
      if (data.section === "body" && data.column.index === 2) {
        data.cell.styles.cellPadding = { top: 0.9, bottom: 3.6, left: 2.5, right: 2.5 };
      }
    },
    didDrawCell: data => {
      if (data.section === "body" && data.column.index === 2) {
        const category = certificate.activities[data.row.index].category;
        fitted(categoryLabels[category] ?? category, data.cell.x + 2.5, data.cell.y + data.cell.height - 1, data.cell.width - 5, 7.5, false, "#555C6E");
      }
    },
    willDrawPage: () => frame(true),
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor("#DCE1ED").setLineWidth(0.2).line(80, 181, 279, 181);
    fitted(`Emitido em ${certificateIssuedAt(certificate.issuedAt)}`, 80, 187, 165, 8, false, "#555C6E");
    fitted(`Código de validação: ${certificate.code}`, 80, 194, 165, 9, true);
    doc.setFont("Inter", "normal").setFontSize(7).setTextColor("#1400FF");
    const address = new URL(certificate.validationUrl);
    const label = address.origin + address.pathname;
    doc.setFontSize(Math.min(7, 7 * 165 / Math.max(165, doc.getTextWidth(label))));
    doc.textWithLink(label, 80, 201, { url: certificate.validationUrl });
    doc.addImage(certificate.qrCode, "PNG", 251, 183, 24, 24);
    fitted(`Página ${page} de ${pages}`, 11, 204, 44, 7, false, "#A9B4F4");
  }
  return doc;
}
