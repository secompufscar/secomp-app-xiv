interface Activity {
  id: string;
  nome: string;
  data: string;
  vagas: int;
  detalhes: string;
  palestranteNome: string;
  palestranteTitulo?: "APRESENTADOR" | "APRESENTADORA";
  categoriaId: string;
  eventId?: string;
  categoria?: Category;
  local: string;
  localLink?: string | null;
  points: number;
};
