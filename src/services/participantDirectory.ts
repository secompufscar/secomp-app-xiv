import api from "./api";

export interface DirectoryParticipant {
  id: string;
  nome: string;
  email: string;
  credentialed: boolean;
  credentialedAt: string | null;
}
export interface ParticipantDirectory {
  users: DirectoryParticipant[];
  event: { id: string; year: number };
  activityId: string;
  page: number;
  pageSize: number;
  total: number;
  credentialedCount: number;
  notCredentialedCount: number;
}
export type CredentialingFilter = "all" | "yes" | "no";

export async function getParticipantDirectory(page: number, q: string, credentialed: CredentialingFilter): Promise<ParticipantDirectory> {
  const response = await api.get("/users/directory", { params: { page, q, credentialed } });
  return response.data;
}

export function formatCredentialingDate(date: string | null): string {
  if (!date || !Number.isFinite(Date.parse(date))) return "Data do credenciamento não disponível";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(date));
}
