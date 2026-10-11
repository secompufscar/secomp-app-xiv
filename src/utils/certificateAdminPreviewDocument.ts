import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { checkedAdminTestCertificate, type AdminTestCertificate } from "./certificateAdminPreview";
import type { CertificateAssets } from "./certificateDocumentV1";

const certificateWorkload = (minutes: number) => {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? "hora" : "horas"}` : "", rest ? `${rest} ${rest === 1 ? "minuto" : "minutos"}` : ""].filter(Boolean).join(" e ");
};

// A separate renderer keeps the frozen, valid certificate templates unchanged.
export function createAdminTestCertificatePdf(input: AdminTestCertificate, assets: CertificateAssets) {
  const certificate = checkedAdminTestCertificate(input), presentation = certificate.presentation!;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const binary = (bytes: Uint8Array) => Array.from(bytes, b => String.fromCharCode(b)).join("");
  doc.addFileToVFS("Inter.ttf", binary(assets.regular)); doc.addFont("Inter.ttf", "Inter", "normal");
  doc.addFileToVFS("Poppins.ttf", binary(assets.bold)); doc.addFont("Poppins.ttf", "Poppins", "normal");
  doc.setProperties({ title: "Certificado Admin [ TESTE ] - SEM VALIDADE", author: `SECOMP ${presentation.issuer}`, subject: certificate.code });
  const text = (value: string, x: number, y: number, size = 10, bold = false, color = "#171923") => {
    doc.setFont(bold ? "Poppins" : "Inter", "normal").setFontSize(size).setTextColor(color).text(value, x, y);
  };
  const fitted = (value: string, x: number, y: number, width: number, size: number, bold = false, color = "#171923") => {
    doc.setFont(bold ? "Poppins" : "Inter", "normal").setFontSize(size);
    text(value, x, y, Math.min(size, size * width / Math.max(width, doc.getTextWidth(value))), bold, color);
  };
  const date = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const logo = (bytes: Uint8Array, x: number, width: number, centerY = 18) => {
    const image = doc.getImageProperties(bytes), height = width * image.height / image.width;
    doc.addImage(bytes, "PNG", x, centerY - height / 2, width, height);
  };
  const ufscar = doc.getImageProperties(assets.ufscar), ufscarWidth = 14 * ufscar.width / ufscar.height;
  const frame = (annex = false) => {
    doc.setFillColor("#FCFCFF").rect(0, 0, 297, 210, "F");
    doc.setFillColor("#0B0B0F").rect(0, 0, 64.5, 210, "F");
    doc.setFillColor("#00FF66").rect(64.5, 0, 1.3, 210, "F");
    logo(assets.secomp, 10, 44, 25);
    text("SECOMP", 10, 53, 22, true, "#FFFFFF");
    fitted(`${presentation.issuer} / ${presentation.city}`, 10, 61, 44, 9, false, "#A9B4F4");
    fitted(presentation.edition, 10, 100, 44, 64, true, "#FFFFFF");
    text("TESTE", 10, 130, 22, true, "#FFFFFF");
    text("SEM VALIDADE", 10, 141, 10, true, "#FCA5A5");
    text(String(certificate.event.year), 11, 194, 23, true, "#00FF66");
    fitted(`${presentation.edition} SECOMP`, 80, 17, 106, 11, true, "#1400FF");
    fitted(presentation.eventName, 80, 24, 106, 8, false, "#555C6E");
    logo(assets.dc, 279 - ufscarWidth - 12 - 40, 40);
    logo(assets.ufscar, 279 - ufscarWidth, ufscarWidth);
    doc.setDrawColor("#DCE1ED").line(80, 29, 279, 29);
    if (annex) {
      text("Atividades certificáveis", 80, 43, 21, true);
      fitted(certificate.participantName, 80, 54, 198, 12, true);
    }
  };
  frame();
  text("Certificado de teste", 79, 48, 27, true);
  text("SEM VALIDADE ACADÊMICA", 80, 58, 10, true, "#B91C1C");
  text("Documento de teste administrativo", 80, 72, 11);
  fitted(certificate.participantName, 80, 87, 198, 27, true);
  doc.setDrawColor("#1400FF").setLineWidth(0.8).line(80, 94, 105, 94);
  fitted(`Todas as atividades certificáveis da ${presentation.edition} SECOMP, de ${date(certificate.event.startDate)} a ${date(certificate.event.endDate)}.`, 80, 108, 199, 10);
  text("Este documento não comprova presença nem concede horas complementares.", 80, 116, 9);
  doc.setFillColor("#EEF0FC").roundedRect(80, 125, 199, 25, 2, 2, "F");
  text("CARGA HORÁRIA TOTAL DAS ATIVIDADES", 86, 133, 8);
  fitted(certificateWorkload(certificate.totalMinutes), 86, 145, 187, 23, true, "#1400FF");
  text("Inclui atividades simultâneas; não representa a carga horária de um participante.", 80, 161, 9);
  text("QR e código de teste: validação sempre inválida.", 80, 174, 10, true, "#B91C1C");
  doc.addPage();
  doc.setLineHeightFactor(1);
  const categories: Record<string, string> = { Palestras: "Palestra", Minicursos: "Minicurso" };
  autoTable(doc, {
    startY: 60, margin: { left: 80, right: 18, top: 60, bottom: 34 },
    head: [["DATA", "HORÁRIO", "ATIVIDADE CERTIFICÁVEL", "DURAÇÃO"]],
    body: certificate.activities.map(activity => [activity.startsAt ? date(activity.startsAt) : "Não informado",
      activity.startsAt ? activity.startsAt.slice(11, 16) : "-", activity.name, certificateWorkload(activity.minutes)]),
    foot: [[{ content: "CARGA HORÁRIA TOTAL", colSpan: 3 }, certificateWorkload(certificate.totalMinutes)]],
    showFoot: "lastPage", theme: "plain", rowPageBreak: "avoid",
    styles: { font: "Inter", fontStyle: "normal", fontSize: 9, cellPadding: 1.5, overflow: "linebreak", textColor: "#171923", lineColor: "#E0E3ED", lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: "#EEF0FC", fontSize: 8, cellPadding: 2 },
    footStyles: { fillColor: "#EEF0FC", font: "Poppins", fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 15, halign: "center" }, 2: { cellWidth: 127 }, 3: { cellWidth: 33, halign: "right" } },
    didParseCell: data => {
      if (data.column.index === 3) {
        data.cell.styles.halign = "right";
        data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 2.5, right: 2.5 };
      }
      if (data.column.index === 1 && data.section === "head") data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 1, right: 1 };
      if (data.section === "body" && data.column.index === 2) data.cell.styles.cellPadding = { top: 1, bottom: 3.6, left: 2.5, right: 2.5 };
    },
    didDrawCell: data => {
      if (data.section === "body" && data.column.index === 2) {
        const category = certificate.activities[data.row.index].category;
        fitted(categories[category] ?? category, data.cell.x + 2.5, data.cell.y + data.cell.height - 1, data.cell.width - 5, 7.5, false, "#555C6E");
      }
    },
    willDrawPage: () => frame(true),
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor("#DCE1ED").setLineWidth(0.2).line(80, 181, 279, 181);
    text("TESTE - SEM VALIDADE", 80, 186, 7.5, true, "#B91C1C");
    text(certificate.code, 80, 191, 9, true);
    doc.setFont("Inter", "normal").setFontSize(7).setTextColor("#1400FF");
    const url = new URL(certificate.validationUrl), label = url.origin + url.pathname;
    doc.setFontSize(Math.min(7, 7 * 165 / Math.max(165, doc.getTextWidth(label))));
    doc.textWithLink(label, 80, 196, { url: certificate.validationUrl });
    doc.addImage(certificate.qrCode, "PNG", 251, 183, 24, 24);
    text(`Página ${page} de ${pages}`, 80, 202, 7, false, "#555C6E");
  }
  return doc;
}
