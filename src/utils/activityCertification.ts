export const DEFAULT_DURATION_SOURCE = "Duração oficial informada pela organização no cadastro da atividade.";

type CertificationActivity = Pick<Activity, "nome" | "categoria" | "durationMinutes" | "durationSource" | "certificateExcluded">;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function isAlwaysNonCertifiable(activity: Pick<Activity, "nome" | "categoria">) {
  const slug = normalize(activity.categoria?.slug ?? "");
  return slug === "credenciamento" || slug.startsWith("credenciamento-")
    || normalize(activity.categoria?.nome ?? "") === "credenciamento"
    || /^(abertura|encerramento|camisetas?|coff?ee?|lual|luau|feira da comp)(?:$|\b)/.test(normalize(activity.nome));
}

export interface CertificationForm { minutes: string; source: string; certifiable: boolean | null }

export function certificationForm(activity?: CertificationActivity): CertificationForm {
  return { minutes: activity?.durationMinutes == null ? "" : String(activity.durationMinutes),
    source: activity?.durationSource ?? DEFAULT_DURATION_SOURCE,
    certifiable: activity ? isAlwaysNonCertifiable(activity) ? false : typeof activity.certificateExcluded === "boolean" ? !activity.certificateExcluded : null : null };
}

export function certificationChanged(form: CertificationForm, activity: CertificationActivity) {
  return JSON.stringify(form) !== JSON.stringify(certificationForm(activity));
}

export function certificationPayload(form: CertificationForm, activity: Pick<Activity, "nome" | "categoria">) {
  if (!/^\d+$/.test(form.minutes.trim()) || !Number.isInteger(Number(form.minutes)) || Number(form.minutes) < 1 || Number(form.minutes) > 10080) {
    throw new Error("Informe a duração oficial inteira, entre 1 e 10080 minutos.");
  }
  if (form.certifiable === null && !isAlwaysNonCertifiable(activity)) throw new Error("Informe se a atividade é certificável.");
  const source = form.source.trim();
  if (!source || source.length > 500) throw new Error("Informe a fonte da duração oficial (até 500 caracteres).");
  return { durationMinutes: Number(form.minutes), durationSource: source,
    certificateExcluded: isAlwaysNonCertifiable(activity) || form.certifiable === false };
}

export function activityCertificationLabel(activity: CertificationActivity) {
  const duration = Number.isInteger(activity.durationMinutes) && activity.durationMinutes! > 0 && activity.durationMinutes! <= 10080
    ? `${activity.durationMinutes} min` : "Duração não cadastrada";
  const status = isAlwaysNonCertifiable(activity) || activity.certificateExcluded === true ? "Não certificável"
    : activity.certificateExcluded === false && activity.durationSource?.trim() && duration !== "Duração não cadastrada" ? "Certificável" : "Certificação pendente";
  return `${duration} · ${status}`;
}
