interface UserAtActivity {
  id: string;
  userId: string;
  activityId: string;
  presente: boolean;
  inscricaoPrevia: boolean;
  listaEspera: boolean;
  createdAt: string;
};

interface ActivityEnrollmentSummary {
  occupiedCount: number;
  presentCount?: number;
  waitlistCount: number;
  waitlistPosition: number | null;
};
