interface Activity {
  id: string;
  nome: string;
  data: string;
  vagas: int;
  detalhes: string;
  palestranteNome: string;
  categoriaId: string;
  eventId?: string;
  categoria?: Category;
  local: string;
  points: number;
};
