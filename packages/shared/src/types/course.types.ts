export interface CourseView {
  id: string;
  title: string;
  description: string;
  modality: string;
  duration: string;
  price: number;
  status: string;
  instructor: { firstName: string; lastName: string };
  // Métricas de la cohorte para la tarjeta del marketplace
  stats: CourseStatsView;
}

export interface CourseStatsView {
  cohortCount: number;
  openCohortCount: number;
  enrolledCount: number;
  totalCapacity: number;
  nextStartDate: string | null;
}
