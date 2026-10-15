export interface SessionView {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  videoUrl: string | null;
}

export interface CohortView {
  id: string;
  courseId: string;
  name: string; // NUEVO
  startDate: string;
  endDate: string;
  capacity: number;
  approvalMode: string;
  deletedAt: string | null;
  sessions: SessionView[];
}
