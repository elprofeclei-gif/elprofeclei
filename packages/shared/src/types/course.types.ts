export interface CourseView {
  id: string;
  title: string;
  description: string;
  modality: string;
  duration: string;
  price: number;
  status: string;
  instructor: { firstName: string; lastName: string };
}
