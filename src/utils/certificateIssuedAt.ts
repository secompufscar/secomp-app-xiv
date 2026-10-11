export function certificateIssuedAt(value: string) {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) throw new Error("Data de emissão do certificado inválida.");
  const timeZone = "America/Sao_Paulo";
  const day = instant.toLocaleDateString("pt-BR", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" });
  const time = instant.toLocaleTimeString("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  return `${day} às ${time} (horário de Brasília)`;
}
