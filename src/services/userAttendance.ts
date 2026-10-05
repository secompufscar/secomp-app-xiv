import { getUserSubscribedActivities } from "./userAtActivities";

export interface AttendedActivity {
  id: string;
  nome: string;
  data: string | null;
  local: string;
}

// This endpoint includes activities from every edition, not just the current schedule.
export async function getUserAttendedActivities(userId: string): Promise<AttendedActivity[]> {
  const rows = await getUserSubscribedActivities(userId) as (UserAtActivity & { activity?: AttendedActivity })[];
  if (!Array.isArray(rows) || rows.some(row => row.userId !== userId || typeof row.presente !== "boolean")) {
    throw new Error("Resposta de presenças inválida");
  }
  const attended = rows.filter(row => row.presente === true).map(row => {
    if (!row.activity || row.activity.id !== row.activityId || !row.activity.nome) {
      throw new Error("Dados da atividade indisponíveis");
    }
    return row.activity;
  });
  return attended.sort((a, b) => (Date.parse(b.data ?? "") || 0) - (Date.parse(a.data ?? "") || 0) || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function formatActivityDate(date: string | null): string {
  if (!date || !Number.isFinite(Date.parse(date))) return "Horário não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
  }).format(new Date(date));
}
