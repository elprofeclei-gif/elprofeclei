export interface EnrollmentView {
  id: string;
  userId: string;
  cohortId: string;
  status: string;
  cohort: {
    courseId: string;
    startDate: string;
    endDate: string;
  };
}
