import api from './api'

// Busca todos os participantes inscritos ou em lista de espera de uma atividade
export async function getParticipantsByActivity(activityId: string): Promise<UserAtActivity[]> {
  const response = await api.get(`/userAtActivities/${activityId}`)
  return response.data
};

// Retorna somente totais e a posição do usuário autenticado, sem expor participantes.
export async function getActivityEnrollmentSummary(
  activityId: string
): Promise<ActivityEnrollmentSummary> {
  const response = await api.get(`/userAtActivities/activity/${activityId}/summary`);
  return response.data;
};

// Busca um vínculo específico entre usuário e atividade
export const userSubscription = async (userId: string,activityId: string): Promise<UserAtActivity> => {
  const response = await api.get(`/userAtActivities/user-activity/${userId}/${activityId}`);
  return response.data;
};

// Obtém todas as atividades de um usuário
export const getUserSubscribedActivities = async (userId: string): Promise<UserAtActivity[]> => {
  const response = await api.get(`/userAtActivities/all-activities/${userId}`);
  return response.data;
};

// Cria uma nova inscrição para o usuário em uma atividade
export const subscribeToActivity = async (
  userId: string,
  eventId: string
): Promise<UserAtActivity> => {
  const response = await api.post("/userAtActivities", {
    userId: userId,
    activityId: eventId,
  });
  return response.data;
};

// Deleta uma inscrição de um usuário em uma atividade
export const unsubscribeToActivity = async (userId: string, eventId: string) => {
  const response = await api.delete(`/userAtActivities/${userId}/${eventId}`);
  return response;
};
