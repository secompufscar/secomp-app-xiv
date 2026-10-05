import { getActivities } from "./activities";
import { getCategories } from "./categories";
import { getCurrentEvent } from "./events";

export class CredentialingError extends Error {}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function isCredentialingCategory(category?: Category): boolean {
  if (!category) return false;
  const slug = normalize(category.slug);
  return slug === "credenciamento" || slug.startsWith("credenciamento-") || normalize(category.nome) === "credenciamento";
}

export function findCredentialingActivity(eventId: string, activities: Activity[], categories: Category[]): Activity {
  const matches = activities.filter(activity => {
    if (activity.eventId !== eventId) return false;
    const category = categories.find(item => item.id === activity.categoriaId) ?? activity.categoria;
    return isCredentialingCategory(category);
  });
  if (matches.length === 0) throw new CredentialingError("Nenhuma atividade de credenciamento foi encontrada na edição atual.");
  if (matches.length > 1) throw new CredentialingError("Há mais de uma atividade de credenciamento nesta edição. Abra a atividade desejada pelo cronograma.");
  return matches[0];
}

export async function getCurrentCredentialingActivity(): Promise<Activity> {
  const event = await getCurrentEvent();
  if (!event?.id) throw new CredentialingError("Nenhuma edição atual foi encontrada para o credenciamento.");
  const [activities, categories] = await Promise.all([getActivities(), getCategories()]);
  return findCredentialingActivity(event.id, activities, categories);
}
