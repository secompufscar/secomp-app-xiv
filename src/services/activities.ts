import api from "./api";

export type UpdateActivityData = Partial<Activity>;
export type CreateActivityData = Omit<Activity, 'id'> & { durationMinutes: number; durationSource: string; certificateExcluded: boolean };

// Busca todas as atividades
export const getActivities = async (): Promise<Activity[]> => {
  const response = await api.get("/activities/");
  return response.data;
};

// Busca uma atividade específica pelo ID
export const getActivityId = async (id: string): Promise<Activity> => {
  const response = await api.get(`/activities/${id}`);
  return response.data;
};

// Cria uma nova atividade
export const createActivity = async (activityData: CreateActivityData): Promise<Activity> => {
  const response = await api.post("/activities/", activityData);
  return response.data;
};

// Atualiza uma atividade existente pelo ID
export const updateActivity = async (id: string, activityData: UpdateActivityData): Promise<Activity> => {
  const response = await api.put(`/activities/${id}`, activityData);
  return response.data;
};

// Deleta uma atividade pelo ID
export const deleteActivity = async (id: string) => {
  const response = await api.delete(`/activities/${id}`);
  return response;
};
